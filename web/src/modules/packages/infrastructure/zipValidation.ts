import { createHash } from 'node:crypto'
import AdmZip from 'adm-zip'

import { readImageInfo } from '@/modules/packages/domain/imageDimensions'
import {
  packageManifestSchema,
  type PackageManifestInput,
} from '@/modules/packages/domain/manifestSchema'
import { PackageValidationError } from '@/modules/packages/domain/packageErrors'
import {
  PACKAGE_LIMITS,
  formatMegabytes,
} from '@/modules/packages/domain/packageLimits'
import type {
  PackageZipValidator,
  ValidatedPackage,
  ValidatedPackageEntry,
} from '@/modules/packages/domain/packageUploadPorts'

/**
 * Restos que el sistema operativo mete solo al comprimir (Finder en macOS:
 * la carpeta `__MACOSX/` con las copias `._*` de los metadatos y los
 * `.DS_Store`). Quien sube el ZIP no los ve ni los ha puesto a propósito, así
 * que se descartan antes de validar nada: no cuentan para los topes, ni para
 * el checksum, ni se publican.
 */
export function isOsJunkPath(entryName: string): boolean {
  const segments = entryName.replace(/\\/g, '/').split('/')

  return segments.includes('__MACOSX') || segments.at(-1) === '.DS_Store'
}

const TEXT_EXTENSIONS = new Set(['html', 'htm', 'js', 'mjs', 'css', 'json'])

// Detecta URLs absolutas en el texto de HTML/JS/CSS, para contrastarlas
// contra el allowlist de externalDomains del manifest (§12.5: "Cualquier
// dominio referenciado debe estar en la allowlist del manifest; si no, la
// subida se rechaza"). Es un escaneo de texto, no un análisis real de JS:
// no detecta URLs construidas dinámicamente (p.ej. concatenando strings) —
// mejor que nada, no una garantía completa. A propósito cuenta TODO:
// enlaces, recursos, texto de citas... (contrato §3) — es deliberadamente
// amplio, no un descuido; lo único que se excluye son los namespaces XML
// de abajo, por ser boilerplate estructural, nunca una referencia real.
const ABSOLUTE_URL_REGEX = /https?:\/\/([a-z0-9.-]+)/gi

// Namespaces XML/SVG estándar (especificaciones W3C): cadenas fijas y
// exactas que el navegador exige tal cual para que un `<svg>` o un
// `xlink:href` funcionen — nunca son una petición de red ni una
// referencia real a contenido de ese dominio. Sin esta lista, CUALQUIER
// SVG inline (`xmlns="http://www.w3.org/2000/svg"`) rechazaba la subida
// por "referenciar www.w3.org", incluso en un paquete sin ningún recurso
// externo real (contrato-zip-tools-insights.md §3).
//
// Coincidencia exacta de la cadena completa (con límite de palabra, ver
// más abajo), no solo del dominio: si algún día un paquete referenciara
// de verdad otra URL de w3.org (poco habitual, pero posible — una fuente
// citada, por ejemplo), esa sigue contando como dominio externo y hay
// que declararla, porque no es ninguna de estas cadenas exactas.
const XML_NAMESPACE_URIS = [
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/2000/xmlns/',
  'http://www.w3.org/XML/1998/namespace',
  'http://www.w3.org/1998/Math/MathML',
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Uno por namespace, con límite de palabra al final: sin él,
// "http://www.w3.org/2000/svg" también "reconocería" por error una URL
// bien distinta como "http://www.w3.org/2000/svgx/otra-cosa" (coincide
// como prefijo). El límite exige que justo después del namespace exacto
// venga algo que NO pueda seguir siendo parte de un host o una ruta
// (comilla, espacio, `>`, fin de texto…), nunca una letra o dígito.
const NAMESPACE_STRIP_PATTERNS = XML_NAMESPACE_URIS.map(
  (uri) => new RegExp(`${escapeRegExp(uri)}(?![A-Za-z0-9.-])`, 'g'),
)

function stripKnownNamespaceUris(text: string): string {
  let result = text
  for (const pattern of NAMESPACE_STRIP_PATTERNS) {
    result = result.replace(pattern, '')
  }
  return result
}

// Heurística de texto para "no Service Workers" (§12.2): busca la llamada
// de registro, no analiza si el archivo se sirve realmente como SW.
const SERVICE_WORKER_REGEX = /serviceWorker\s*\.\s*register\s*\(/i

/**
 * Valida un ZIP de tool/insight contra el contrato de §12.2/§12.5 y
 * devuelve sus entradas ya verificadas, listas para subir a Storage.
 * El escaneo antivirus no va aquí: lo hace `scanZipForViruses`
 * (Cloudmersive) en `uploadHtmlPackage`, sobre el ZIP en crudo.
 */
export function validateHtmlPackageZip(buffer: Buffer): ValidatedPackage {
  if (buffer.byteLength > PACKAGE_LIMITS.maxZipSizeBytes) {
    throw new PackageValidationError([
      `El ZIP supera el límite de ${formatMegabytes(PACKAGE_LIMITS.maxZipSizeBytes)}.`,
    ])
  }

  let zipEntries: AdmZip.IZipEntry[]

  // `getEntries()` es quien lee el directorio central y quien falla con una
  // ruta repetida (`ADM-ZIP: Duplicate entry name "…"`): va dentro del `try`
  // para que ese fallo salga como un rechazo claro y no como un error genérico.
  try {
    zipEntries = new AdmZip(buffer)
      .getEntries()
      .filter((entry) => !isOsJunkPath(entry.entryName))
  } catch (error) {
    const duplicate = /Duplicate entry name "([^"]*)"/.exec(
      error instanceof Error ? error.message : '',
    )

    throw new PackageValidationError([
      duplicate
        ? `El ZIP contiene dos ficheros con la misma ruta: "${duplicate[1]}".`
        : 'El archivo no es un ZIP válido.',
    ])
  }

  const structuralIssues: string[] = []
  const entries: ValidatedPackageEntry[] = []
  const entryPaths = new Set<string>()

  // ZIP bomb: se comprueban los tamaños DECLARADOS antes de descomprimir
  // nada. Eso solo vale si la descompresión no puede pasar de lo declarado:
  // adm-zip la corta en el tamaño de la cabecera (y el 0 declarado cuenta como
  // 1 byte, no como «sin tope»), y `readEntryData` convierte ese corte, o
  // cualquier otro fallo de inflado, en un rechazo de validación. Una cabecera
  // que miente, por tanto, no ocupa memoria de más ni acaba en un 500.
  assertWithinUncompressedLimits(zipEntries)

  for (const entry of zipEntries) {
    if (entry.isDirectory) {
      continue
    }

    const path = entry.entryName.replace(/\\/g, '/')

    // Protección zip-slip (§12.5): nada de rutas absolutas ni segmentos
    // ".." que puedan salir de la carpeta del paquete al extraer.
    if (path.startsWith('/') || path.split('/').includes('..')) {
      structuralIssues.push(`Ruta no permitida en el ZIP: "${path}".`)
      continue
    }

    // Symlinks (§12.5): bit de symlink en los permisos unix altos del
    // header de la entrada (formato ZIP estándar, bits 16-31 de external
    // attributes cuando el ZIP se creó en un sistema unix).
    const unixMode = (entry.header.attr >>> 16) & 0xffff
    const isSymlink = (unixMode & 0xa000) === 0xa000

    if (isSymlink) {
      structuralIssues.push(`Symlink no permitido en el ZIP: "${path}".`)
      continue
    }

    entryPaths.add(path)
    entries.push({ path, data: readEntryData(entry, path) })
  }

  if (structuralIssues.length > 0) {
    throw new PackageValidationError(structuralIssues)
  }

  if (!entryPaths.has('index.html')) {
    const wrapper = findWrapperFolder(entryPaths)

    throw new PackageValidationError([
      wrapper
        ? `Falta index.html en la raíz del ZIP (§12.2): has comprimido la carpeta «${wrapper}» en vez de su contenido. Comprime los ficheros de dentro (index.html, manifest.json y assets), no la carpeta que los contiene.`
        : 'Falta index.html en la raíz del ZIP (§12.2).',
    ])
  }

  // Todo lo que no sea index.html/manifest.json debe vivir bajo assets/
  // (contrato §1). La ruta de assets siempre busca en Storage bajo
  // `<versión>/assets/...`: un archivo suelto en la raíz daría 404 ya
  // publicado, y es mejor rechazarlo aquí con un mensaje claro.
  const misplacedEntries = entries.filter(
    (entry) =>
      entry.path !== 'index.html' &&
      entry.path !== 'manifest.json' &&
      !entry.path.startsWith('assets/'),
  )

  for (const entry of misplacedEntries) {
    structuralIssues.push(
      `"${entry.path}" está fuera de la carpeta assets/ — todo el paquete, salvo index.html y manifest.json, debe vivir bajo assets/ (§1).`,
    )
  }

  if (structuralIssues.length > 0) {
    throw new PackageValidationError(structuralIssues)
  }

  const manifestEntry = entries.find((entry) => entry.path === 'manifest.json')

  if (!manifestEntry) {
    throw new PackageValidationError([
      'Falta manifest.json en la raíz del ZIP.',
    ])
  }

  let manifestRaw: unknown

  try {
    manifestRaw = JSON.parse(manifestEntry.data.toString('utf-8'))
  } catch {
    throw new PackageValidationError(['manifest.json no es JSON válido.'])
  }

  const manifestResult = packageManifestSchema.safeParse(manifestRaw)

  if (!manifestResult.success) {
    throw new PackageValidationError(
      manifestResult.error.issues.map(
        (issue) => `manifest.json: ${issue.path.join('.')}: ${issue.message}`,
      ),
    )
  }

  if (!entryPaths.has(manifestResult.data.entrypoint)) {
    throw new PackageValidationError([
      `El entrypoint "${manifestResult.data.entrypoint}" declarado en manifest.json no existe en el ZIP.`,
    ])
  }

  // Documentos HTML adicionales (SEC-PUB-B1, decidido el 27 oct 2026): el
  // contrato solo exige `index.html` (o el entrypoint declarado). Un `.html`
  // o `.htm` más, abierto por su URL directa, sería otro documento en el
  // origen del sitio. El servidor ya le pone una CSP sin scripts, pero lo
  // más sencillo es no admitirlo.
  const extraDocuments = entries.filter(
    (entry) =>
      /\.html?$/i.test(entry.path) &&
      entry.path !== 'index.html' &&
      entry.path !== manifestResult.data.entrypoint,
  )

  if (extraDocuments.length > 0) {
    throw new PackageValidationError(
      extraDocuments.map(
        (entry) =>
          `"${entry.path}" es un documento HTML adicional: el paquete solo puede llevar index.html (o el entrypoint del manifest). Quita los demás .html/.htm.`,
      ),
    )
  }

  const manifest = withMeasuredOgImage(manifestResult.data, entries)

  const declaredDomains = new Set(
    manifest.externalDomains.map((domain) => domain.toLowerCase()),
  )
  const contentIssues: string[] = []
  // Un mismo dominio sin declarar puede aparecer decenas de veces en un
  // insight con muchas citas a la misma fuente — un aviso por aparición
  // ahogaría el resto de la lista. Un aviso por (archivo, dominio) basta:
  // dice dónde está y qué falta declarar, sin repetirse.
  const reportedPerFile = new Set<string>()

  for (const entry of entries) {
    const extension = entry.path.split('.').pop()?.toLowerCase() ?? ''

    if (!TEXT_EXTENSIONS.has(extension)) {
      continue
    }

    const text = entry.data.toString('utf-8')

    if (SERVICE_WORKER_REGEX.test(text)) {
      contentIssues.push(
        `"${entry.path}" registra un Service Worker, no permitido (§12.2).`,
      )
    }

    const scannedText = stripKnownNamespaceUris(text)

    for (const match of scannedText.matchAll(ABSOLUTE_URL_REGEX)) {
      const host = match[1]?.toLowerCase()

      if (!host || declaredDomains.has(host)) {
        continue
      }

      const key = `${entry.path}\u0000${host}`

      if (reportedPerFile.has(key)) {
        continue
      }

      reportedPerFile.add(key)
      contentIssues.push(
        `"${entry.path}" referencia el dominio externo "${host}", que no está en externalDomains del manifest.`,
      )
    }
  }

  if (contentIssues.length > 0) {
    throw new PackageValidationError(contentIssues)
  }

  const checksum = computeContentChecksum(entries)

  return { manifest, entries, checksum }
}

/**
 * Comprueba la imagen Open Graph declarada en `metadata.ogImage` (contrato
 * §2.1) y devuelve el manifest con sus medidas REALES (`width`/`height`)
 * escritas: el servidor las usa en `og:image:width/height`, y lo que el
 * autor hubiera puesto a mano se descarta.
 *
 * Se rechaza si el fichero no existe, no es una imagen real del formato que
 * dice su extensión, pesa demasiado, es más pequeña que 1200 × 630 o su
 * proporción se aleja de 1,91:1 (las redes la recortarían).
 */
function withMeasuredOgImage(
  manifest: PackageManifestInput,
  entries: ValidatedPackageEntry[],
): PackageManifestInput {
  const { ogImage } = manifest.metadata
  const limits = PACKAGE_LIMITS.ogImage
  const label = `manifest.json: metadata.ogImage.path ("${ogImage.path}")`

  const entry = entries.find((candidate) => candidate.path === ogImage.path)

  if (!entry) {
    throw new PackageValidationError([`${label} no existe en el ZIP.`])
  }

  if (entry.data.byteLength > limits.maxBytes) {
    throw new PackageValidationError([
      `${label} pesa ${(entry.data.byteLength / 1_000_000).toFixed(1)} MB; el máximo es ${limits.maxBytes / 1_000_000} MB.`,
    ])
  }

  const info = readImageInfo(entry.data)
  const extension = ogImage.path.split('.').pop()!.toLowerCase()
  const expectedFormat = extension === 'jpg' ? 'jpeg' : extension

  if (!info || info.format !== expectedFormat) {
    throw new PackageValidationError([
      `${label} no es una imagen ${expectedFormat.toUpperCase()} válida (el contenido no coincide con la extensión).`,
    ])
  }

  if (info.width < limits.minWidth || info.height < limits.minHeight) {
    throw new PackageValidationError([
      `${label} mide ${info.width} × ${info.height} px; el mínimo es ${limits.minWidth} × ${limits.minHeight} px.`,
    ])
  }

  const ratio = info.width / info.height

  if (Math.abs(ratio / limits.ratio - 1) > limits.ratioTolerance) {
    throw new PackageValidationError([
      `${label} tiene proporción ${ratio.toFixed(2)}:1 (${info.width} × ${info.height} px); debe ser cercana a 1,91:1 (1200 × 630), con un ±5 % de margen.`,
    ])
  }

  return {
    ...manifest,
    metadata: {
      ...manifest.metadata,
      ogImage: { ...ogImage, width: info.width, height: info.height },
    },
  }
}

/**
 * Descomprime una entrada. Cualquier fallo (datos corruptos, o un flujo que
 * al inflar supera el tamaño que declara la cabecera: bomba que miente) se
 * traduce a un error de validación con un mensaje para el admin, sin volcar
 * el error interno de la librería. Además comprueba el tamaño real obtenido
 * contra los topes, por si la librería dejase de acotarlo.
 */
function readEntryData(entry: AdmZip.IZipEntry, path: string): Buffer {
  let data: Buffer

  try {
    data = entry.getData()
  } catch {
    throw new PackageValidationError([
      `"${path}" está corrupto o su tamaño real no coincide con el que declara el ZIP.`,
    ])
  }

  if (data.byteLength > PACKAGE_LIMITS.maxEntryUncompressedBytes) {
    throw new PackageValidationError([
      `"${path}" ocupa más de ${PACKAGE_LIMITS.maxEntryUncompressedBytes / 1_000_000} MB descomprimido; el máximo por fichero es ${PACKAGE_LIMITS.maxEntryUncompressedBytes / 1_000_000} MB.`,
    ])
  }

  return data
}

function assertWithinUncompressedLimits(zipEntries: AdmZip.IZipEntry[]): void {
  if (zipEntries.length > PACKAGE_LIMITS.maxEntries) {
    throw new PackageValidationError([
      `El ZIP tiene ${zipEntries.length} ficheros; el máximo es ${PACKAGE_LIMITS.maxEntries}.`,
    ])
  }

  let total = 0

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue

    const size = entry.header.size

    if (size > PACKAGE_LIMITS.maxEntryUncompressedBytes) {
      throw new PackageValidationError([
        `"${entry.entryName}" ocupa ${Math.round(size / 1_000_000)} MB descomprimido; el máximo por fichero es ${PACKAGE_LIMITS.maxEntryUncompressedBytes / 1_000_000} MB.`,
      ])
    }

    total += size
  }

  if (total > PACKAGE_LIMITS.maxUncompressedBytes) {
    throw new PackageValidationError([
      `El contenido descomprimido del ZIP ocupa ${Math.round(total / 1_000_000)} MB; el máximo es ${PACKAGE_LIMITS.maxUncompressedBytes / 1_000_000} MB.`,
    ])
  }
}

/**
 * Checksum del CONTENIDO del paquete (rutas + bytes, ordenados), no del
 * ZIP en crudo: dos ZIPs con el mismo contenido pueden diferir byte a
 * byte por metadatos internos (fechas de cada entrada, por ejemplo), así
 * que hashear el buffer completo daría un checksum distinto para el
 * "mismo" paquete según cómo se comprimiera. Esto es estable frente a eso.
 */
/**
 * El caso típico de «Falta index.html»: se comprime la CARPETA del paquete (el
 * Finder de macOS lo hace con «Comprimir») y todo queda bajo `carpeta/`. Devuelve
 * el nombre de esa carpeta única si todo el contenido cuelga de ella y trae su
 * `index.html`; null en cualquier otro caso. Los restos de macOS
 * (`__MACOSX/`, `.DS_Store`) no cuentan.
 */
function findWrapperFolder(paths: ReadonlySet<string>): string | null {
  const real = [...paths]

  const folders = new Set(real.map((path) => path.split('/')[0]))

  if (folders.size !== 1) return null

  const [folder] = [...folders]

  if (!real.every((path) => path.startsWith(`${folder}/`))) return null

  return paths.has(`${folder}/index.html`) ? folder.slice(0, 60) : null
}

function computeContentChecksum(entries: ValidatedPackageEntry[]): string {
  const hash = createHash('sha256')

  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path))

  for (const entry of sorted) {
    hash.update(entry.path)
    hash.update('\0')
    hash.update(entry.data)
  }

  return hash.digest('hex')
}

export const zipPackageValidator: PackageZipValidator = {
  validate: validateHtmlPackageZip,
}
