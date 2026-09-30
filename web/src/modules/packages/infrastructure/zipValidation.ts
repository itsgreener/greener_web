import AdmZip from 'adm-zip'
import { createHash } from 'node:crypto'

import {
  packageManifestSchema,
  type PackageManifestInput,
} from '../domain/manifestSchema'
import { PACKAGE_LIMITS } from '../domain/packageLimits'

export class PackageValidationError extends Error {
  issues: string[]

  constructor(issues: string[]) {
    super(issues.join(' — '))
    this.name = 'PackageValidationError'
    this.issues = issues
  }
}

export type ValidatedPackageEntry = {
  path: string
  data: Buffer
}

export type ValidatedPackage = {
  manifest: PackageManifestInput
  entries: ValidatedPackageEntry[]
  checksum: string
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
// externo real (falso positivo real, encontrado el 28 de septiembre —
// contrato-zip-tools-insights.md §3 — y corregido aquí el 29).
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
 * No hace escaneo antivirus (§12.5 lo exige y no hay motor disponible en
 * este entorno) — hueco real, documentado en PROGRESO.md, no fingido aquí.
 */
export function validateHtmlPackageZip(buffer: Buffer): ValidatedPackage {
  if (buffer.byteLength > PACKAGE_LIMITS.maxZipSizeBytes) {
    throw new PackageValidationError([
      `El ZIP supera el límite de ${PACKAGE_LIMITS.maxZipSizeBytes / 1_000_000} MB.`,
    ])
  }

  let zip: AdmZip

  try {
    zip = new AdmZip(buffer)
  } catch {
    throw new PackageValidationError(['El archivo no es un ZIP válido.'])
  }

  const structuralIssues: string[] = []
  const entries: ValidatedPackageEntry[] = []
  const entryPaths = new Set<string>()

  for (const entry of zip.getEntries()) {
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
    entries.push({ path, data: entry.getData() })
  }

  if (structuralIssues.length > 0) {
    throw new PackageValidationError(structuralIssues)
  }

  if (!entryPaths.has('index.html')) {
    throw new PackageValidationError([
      'Falta index.html en la raíz del ZIP (§12.2).',
    ])
  }

  // Todo lo que no sea index.html/manifest.json debe vivir bajo assets/
  // (contrato §1). Antes de esta comprobación (29 sep), un archivo mal
  // colocado en la raíz pasaba la validación sin avisar y luego daba 404
  // en la página publicada, porque la ruta que sirve los assets siempre
  // busca en Storage bajo `<versión>/assets/...` (ver
  // `getStoragePackageAsset` / bug real corregido en la misma sesión).
  // Mejor rechazarlo aquí, con un mensaje claro, que descubrirlo así.
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

  const manifest = manifestResult.data

  if (!entryPaths.has(manifest.entrypoint)) {
    throw new PackageValidationError([
      `El entrypoint "${manifest.entrypoint}" declarado en manifest.json no existe en el ZIP.`,
    ])
  }

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
 * Checksum del CONTENIDO del paquete (rutas + bytes, ordenados), no del
 * ZIP en crudo: dos ZIPs con el mismo contenido pueden diferir byte a
 * byte por metadatos internos (fechas de cada entrada, por ejemplo), así
 * que hashear el buffer completo daría un checksum distinto para el
 * "mismo" paquete según cómo se comprimiera. Esto es estable frente a eso.
 */
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
