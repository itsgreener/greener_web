/**
 * Comprobación de un archivo ya subido al almacén de medios (Cloudinary).
 *
 * El navegador sube el archivo directamente, así que sus metadatos
 * (formato, medidas, peso, duración) no son de fiar: antes de registrarlo en
 * la base de datos se consulta el archivo real a través de este puerto.
 */
export type VerifiedImageAsset = {
  cloudinaryPublicId: string
  format: string
  width: number
  height: number
  bytes: number
}

export type VerifiedVideoAsset = {
  cloudinaryPublicId: string
  format: string
  width: number
  height: number
  /** Duración REAL en segundos (puede traer decimales; el esquema la redondea hacia arriba). */
  durationSeconds: number
  bytes: number
}

/** El archivo no existe, no es de la carpeta permitida o no cumple las reglas. El mensaje es para el equipo. */
export class ImageVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageVerificationError'
  }
}

export class VideoVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VideoVerificationError'
  }
}

export interface MediaVerifier {
  /** @throws ImageVerificationError */
  verifyImage(publicId: string): Promise<VerifiedImageAsset>

  /** @throws VideoVerificationError */
  verifyVideo(
    publicId: string,
    reportedDurationSeconds?: number,
  ): Promise<VerifiedVideoAsset>
}
