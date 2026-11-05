import { getCloudmersiveEnv } from '@/lib/serverEnv'

import { VirusScanError } from '@/modules/packages/domain/packageErrors'
import { formatMegabytes } from '@/modules/packages/domain/packageLimits'
import type { VirusScanner } from '@/modules/packages/domain/packageUploadPorts'

const CLOUDMERSIVE_SCAN_URL = 'https://api.cloudmersive.com/virus/scan/file'

/**
 * Tiempo máximo de la petición completa (envío del fichero y lectura de la
 * respuesta). Antes el comentario de `scanFileForViruses` decía que se
 * rechazaba si el servicio «tarda demasiado», pero nada lo cumplía y una
 * subida podía quedarse colgada hasta el tope del servidor (SEC-ADM-C2). Con
 * 3,5 MB de tope, 30 s dan margen de sobra; al vencer, el `catch` de abajo lo
 * convierte en un rechazo, como cualquier otro fallo del servicio.
 */
export const CLOUDMERSIVE_TIMEOUT_MS = 30_000

/**
 * Tamaño máximo que admite el escaneo en la cuenta gratuita de Cloudmersive:
 * 3,5 MB (su aviso del 28 oct 2026: «Your API call exceeded 3.5 MB file size
 * limit of free tier»; el 400 que devuelve no explica la causa). Se cuenta en
 * decimal (3.500.000 bytes) por prudencia: es la lectura más estricta. Con un
 * plan de pago se sube aquí y en `PACKAGE_LIMITS.maxZipSizeBytes` y
 * `TALENT_FILE_LIMITS.maxFileBytes`; un test comprueba que no se desalineen.
 */
export const CLOUDMERSIVE_MAX_FILE_BYTES = 3_500_000

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
 * que sube un candidato (cuenta gratuita: mismo tope de 3,5 MB decimales).
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
      `El ${label} supera el tamaño máximo que admite el servicio de escaneo antivirus (${formatMegabytes(CLOUDMERSIVE_MAX_FILE_BYTES)}).`,
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
    // El cuerpo de un error de Cloudmersive suele explicar la causa (tamaño,
    // formato, cuota…). Va al log del servidor, nunca al mensaje que ve el
    // admin ni a la base de datos; sin él, un 400 no se puede diagnosticar.
    console.error(
      'Antivirus · Cloudmersive respondió',
      response.status,
      await readErrorBody(response),
    )

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

const ERROR_BODY_LOG_LIMIT = 500

async function readErrorBody(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, ERROR_BODY_LOG_LIMIT)
  } catch {
    return '(sin cuerpo legible)'
  }
}

export const cloudmersiveVirusScanner: VirusScanner = {
  scan: scanZipForViruses,
}
