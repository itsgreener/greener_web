/**
 * Lee formato y medidas de una imagen directamente de sus primeros bytes,
 * sin decodificarla ni depender de ninguna librería: solo lo imprescindible
 * para validar la imagen Open Graph de un paquete (PNG, JPEG y WebP, los tres
 * formatos que aceptan los scrapers de redes sociales).
 *
 * Devuelve `null` si los bytes no son una imagen válida de esos formatos o
 * están truncados: la validación lo trata como «no es una imagen real», que
 * es justo lo que se quiere detectar (un .png que en realidad es otra cosa).
 */

type ImageFormat = 'png' | 'jpeg' | 'webp'

export type ImageInfo = {
  format: ImageFormat
  width: number
  height: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function startsWith(data: Buffer, bytes: number[], offset = 0): boolean {
  return bytes.every((byte, index) => data[offset + index] === byte)
}

function readPng(data: Buffer): ImageInfo | null {
  // Firma (8) + longitud (4) + «IHDR» (4) + ancho (4) + alto (4).
  if (data.length < 24 || !startsWith(data, PNG_SIGNATURE)) return null
  if (data.toString('latin1', 12, 16) !== 'IHDR') return null

  return {
    format: 'png',
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  }
}

function readJpeg(data: Buffer): ImageInfo | null {
  if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) return null

  let offset = 2

  while (offset + 4 <= data.length) {
    if (data[offset] !== 0xff) return null

    const marker = data[offset + 1]!

    // Relleno 0xFF entre segmentos.
    if (marker === 0xff) {
      offset += 1
      continue
    }

    // Marcadores sin longitud (SOI, EOI, RSTn, TEM): no hay medidas aún.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2
      continue
    }

    const length = data.readUInt16BE(offset + 2)

    // SOF0..SOF15, salvo DHT (C4), JPG (C8) y DAC (CC), que no son cabeceras
    // de imagen.
    const isFrameHeader =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc

    if (isFrameHeader) {
      if (offset + 9 > data.length) return null

      return {
        format: 'jpeg',
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      }
    }

    if (length < 2) return null
    offset += 2 + length
  }

  return null
}

function readWebp(data: Buffer): ImageInfo | null {
  if (
    data.length < 30 ||
    data.toString('latin1', 0, 4) !== 'RIFF' ||
    data.toString('latin1', 8, 12) !== 'WEBP'
  ) {
    return null
  }

  const chunk = data.toString('latin1', 12, 16)

  if (chunk === 'VP8 ') {
    // Lossy: tras la etiqueta de fotograma (3 bytes) va el código de inicio.
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) return null

    return {
      format: 'webp',
      width: data.readUInt16LE(26) & 0x3fff,
      height: data.readUInt16LE(28) & 0x3fff,
    }
  }

  if (chunk === 'VP8L') {
    // Lossless: firma 0x2f y 14 + 14 bits con (ancho − 1) y (alto − 1).
    if (data[20] !== 0x2f) return null

    const bits = data.readUInt32LE(21)

    return {
      format: 'webp',
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    }
  }

  if (chunk === 'VP8X') {
    // Extendido: (ancho − 1) y (alto − 1) en 3 bytes little-endian cada uno.
    return {
      format: 'webp',
      width: data.readUIntLE(24, 3) + 1,
      height: data.readUIntLE(27, 3) + 1,
    }
  }

  return null
}

export function readImageInfo(data: Buffer): ImageInfo | null {
  const info = readPng(data) ?? readJpeg(data) ?? readWebp(data)

  if (!info || info.width <= 0 || info.height <= 0) return null

  return info
}
