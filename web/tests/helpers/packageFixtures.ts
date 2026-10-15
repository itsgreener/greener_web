/**
 * Piezas para construir paquetes de prueba con el bloque `metadata` que exige
 * el contrato del ZIP (§2.1): metadatos válidos e imágenes mínimas (solo la
 * cabecera que lee `readImageInfo`, no hace falta una imagen decodificable).
 */

export const OG_IMAGE_PATH = 'assets/og.png'

export const VALID_METADATA = {
  title: 'Pixel Palette',
  description: 'Extrae una paleta de colores de cualquier imagen.',
  language: 'es',
  ogImage: { path: OG_IMAGE_PATH, alt: 'Paleta de colores sobre fondo blanco' },
}

export function pngBytes(width = 1200, height = 630): Buffer {
  const data = Buffer.alloc(33)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(data)
  data.writeUInt32BE(13, 8)
  data.write('IHDR', 12, 'latin1')
  data.writeUInt32BE(width, 16)
  data.writeUInt32BE(height, 20)
  return data
}

export function jpegBytes(width = 1200, height = 630): Buffer {
  // SOI + APP0 (16 bytes) + SOF0 con las medidas.
  const data = Buffer.alloc(2 + 18 + 19)
  data.writeUInt16BE(0xffd8, 0)
  data.writeUInt16BE(0xffe0, 2)
  data.writeUInt16BE(16, 4)
  data.writeUInt16BE(0xffc0, 20)
  data.writeUInt16BE(17, 22)
  data[24] = 8
  data.writeUInt16BE(height, 25)
  data.writeUInt16BE(width, 27)
  return data
}

export function webpBytes(
  kind: 'lossy' | 'lossless' | 'extended',
  width = 1200,
  height = 630,
): Buffer {
  const data = Buffer.alloc(40)
  data.write('RIFF', 0, 'latin1')
  data.write('WEBP', 8, 'latin1')

  if (kind === 'lossy') {
    data.write('VP8 ', 12, 'latin1')
    data[23] = 0x9d
    data[24] = 0x01
    data[25] = 0x2a
    data.writeUInt16LE(width, 26)
    data.writeUInt16LE(height, 28)
  } else if (kind === 'lossless') {
    data.write('VP8L', 12, 'latin1')
    data[20] = 0x2f
    data.writeUInt32LE(((height - 1) << 14) | (width - 1), 21)
  } else {
    data.write('VP8X', 12, 'latin1')
    data.writeUIntLE(width - 1, 24, 3)
    data.writeUIntLE(height - 1, 27, 3)
  }

  return data
}
