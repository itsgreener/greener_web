import {
  ALLOWED_FILE_EXTENSIONS,
  type AllowedFileExtension,
} from './talentConstants'

/**
 * Tipo real de un fichero según sus primeros bytes. El navegador manda el
 * nombre y el tipo MIME que quiere el visitante; la subida se decide por lo
 * que el fichero ES, no por lo que dice ser.
 */
export type FileKind = 'pdf' | 'doc' | 'docx' | 'png' | 'jpeg' | 'webp'

const MIME_BY_KIND: Readonly<Record<FileKind, string>> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

/** Extensiones que admite cada tipo detectado. */
const EXTENSIONS_BY_KIND: Readonly<
  Record<FileKind, readonly AllowedFileExtension[]>
> = {
  pdf: ['pdf'],
  doc: ['doc'],
  docx: ['docx'],
  png: ['png'],
  jpeg: ['jpg', 'jpeg'],
  webp: ['webp'],
}

function startsWith(
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
) {
  return signature.every((value, index) => bytes[offset + index] === value)
}

/**
 * `null` si no es ninguno de los tipos admitidos. Un `.docx` es un ZIP (`PK`)
 * y un `.doc` un contenedor OLE2: esas firmas no distinguen un Word de otro
 * documento del mismo contenedor, pero el antivirus y n8n hacen el resto, y
 * aquí basta con descartar lo que claramente no es un documento.
 */
export function detectFileKind(bytes: Uint8Array): FileKind | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'pdf' // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png'
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'

  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && // RIFF
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8) // WEBP
  ) {
    return 'webp'
  }

  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    return 'doc'
  }

  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'docx'

  return null
}

/** Extensión en minúsculas del nombre que manda el visitante, si es admitida. */
export function allowedExtensionOf(
  fileName: string,
): AllowedFileExtension | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim())
  const extension = match?.[1]?.toLowerCase()

  return (
    ALLOWED_FILE_EXTENSIONS.find((allowed) => allowed === extension) ?? null
  )
}

export function contentTypeOf(kind: FileKind): string {
  return MIME_BY_KIND[kind]
}

/** ¿La extensión que declara el nombre es coherente con el contenido? */
export function extensionMatchesKind(
  extension: AllowedFileExtension,
  kind: FileKind,
): boolean {
  return EXTENSIONS_BY_KIND[kind].includes(extension)
}
