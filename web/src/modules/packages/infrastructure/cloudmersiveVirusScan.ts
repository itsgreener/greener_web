import { env } from '@/lib/env'

const CLOUDMERSIVE_SCAN_URL = 'https://api.cloudmersive.com/virus/scan/file'

export class VirusScanError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VirusScanError'
  }
}

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
  const formData = new FormData()
  formData.append(
    'inputFile',
    new Blob([new Uint8Array(buffer)]),
    'package.zip',
  )

  let response: Response

  try {
    response = await fetch(CLOUDMERSIVE_SCAN_URL, {
      method: 'POST',
      headers: {
        Apikey: env.CLOUDMERSIVE_API_KEY,
      },
      body: formData,
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
