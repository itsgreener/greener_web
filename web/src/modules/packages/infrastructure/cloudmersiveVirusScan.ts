import { getCloudmersiveEnv } from '@/lib/serverEnv'

import { VirusScanError } from '@/modules/packages/domain/packageErrors'
import type { VirusScanner } from '@/modules/packages/domain/packageUploadPorts'

const CLOUDMERSIVE_SCAN_URL = 'https://api.cloudmersive.com/virus/scan/file'

/**
 * Tiempo máximo de la petición completa (envío del fichero y lectura de la
 * respuesta). Antes el comentario de `scanFileForViruses` decía que se
 * rechazaba si el servicio «tarda demasiado», pero nada lo cumplía y una
 * subida podía quedarse colgada hasta el tope del servidor (SEC-ADM-C2). Con
 * 10 MB de tope, 30 s dan margen de sobra; al vencer, el `catch` de abajo lo
 * convierte en un rechazo, como cualquier otro fallo del servicio.
 */
export const CLOUDMERSIVE_TIMEOUT_MS = 30_000

/**
 * Tamaño máximo que admite el escaneo (cuenta gratuita de Cloudmersive:
 * "requires paid account for >10MB"). Se cuenta en decimal (10.000.000
 * bytes) por prudencia — su documentación no aclara si son MB o MiB.
 * Debe ser >= `PACKAGE_LIMITS.maxZipSizeBytes`; un test lo comprueba.
 */
export const CLOUDMERSIVE_MAX_FILE_BYTES = 10 * 1000 * 1000

type CloudmersiveScanResult = {
  CleanResult?: boolean
  FoundViruses?: Array<{ FileName?: string; VirusName?: string }> | null
}

/**
 * Escanea el ZIP con Cloudmersive antes de publicarlo en Storage (§12.5).
 * Bloqueante a propósito: si el servicio no responde, tarda demasiado o
 * el resultado no es explícitamente limpio, la subida se rechaza — es una
 * comprobación de seguridad, no de limpieza (a diferencia del borrado de
 * medios huérfanos en Cloudinary, que sí es best-effort porque ahí lo que
 * se arriesga es gasto de cuota, no un archivo malicioso publicado).
 *
 * No usa el SDK oficial de Cloudmersive (paquete `cloudmersive-virus-api-
 * client`) para no añadir una dependencia nueva de más: es una única
 * llamada HTTP multipart, perfectamente cubierta por fetch/FormData
 * nativos de Node.
 */
export async function scanZipForViruses(buffer: Buffer): Promise<void> {
  await scanFileForViruses(buffer, 'package.zip', 'ZIP')
}

/**
 * El mismo escaneo para cualquier fichero. Lo usa también talent con los CVs
 * que sube un candidato (cuenta gratuita: mismo tope de 10 MB decimales).
 * `label` solo cambia el texto del tope de tamaño («El ZIP supera…»).
 */
export async function scanFileForViruses(
  buffer: Buffer,
  fileName: string,
  label = 'archivo',
): Promise<void> {
  // Guarda defensiva: normalmente `validateHtmlPackageZip` ya habrá
  // rechazado un ZIP mayor (PACKAGE_LIMITS), pero si alguien sube ese
  // límite sin tocar este, mejor un mensaje claro y sin enviar 15 MB que
  // luego el servicio rechazaría con un error opaco. Sigue siendo
  // bloqueante: nunca se publica un ZIP sin escanear.
  if (buffer.byteLength > CLOUDMERSIVE_MAX_FILE_BYTES) {
    throw new VirusScanError(
      `El ${label} supera el tamaño máximo que admite el servicio de escaneo antivirus (${CLOUDMERSIVE_MAX_FILE_BYTES / 1_000_000} MB).`,
    )
  }

  const formData = new FormData()
  formData.append('inputFile', new Blob([new Uint8Array(buffer)]), fileName)

  let response: Response

  try {
    response = await fetch(CLOUDMERSIVE_SCAN_URL, {
      method: 'POST',
      headers: {
        Apikey: getCloudmersiveEnv().CLOUDMERSIVE_API_KEY,
      },
      body: formData,
      signal: AbortSignal.timeout(CLOUDMERSIVE_TIMEOUT_MS),
    })
  } catch {
    throw new VirusScanError(
      'No se ha podido contactar con el servicio de escaneo antivirus.',
    )
  }

  if (!response.ok) {
    throw new VirusScanError(
      `El servicio de escaneo antivirus ha devuelto un error (${response.status}).`,
    )
  }

  let result: CloudmersiveScanResult

  try {
    result = (await response.json()) as CloudmersiveScanResult
  } catch {
    throw new VirusScanError(
      'La respuesta del servicio de escaneo antivirus no se ha podido interpretar.',
    )
  }

  if (result.CleanResult !== true) {
    const foundNames = (result.FoundViruses ?? [])
      .map((virus) => virus.VirusName)
      .filter(Boolean)
      .join(', ')

    throw new VirusScanError(
      foundNames
        ? `El escaneo antivirus ha encontrado contenido malicioso: ${foundNames}.`
        : 'El escaneo antivirus no ha confirmado que el archivo esté limpio.',
    )
  }
}

export const cloudmersiveVirusScanner: VirusScanner = {
  scan: scanZipForViruses,
}
