/**
 * Worker de "Pixel Palette". Recibe los píxeles de un ImageData (como
 * Uint8ClampedArray transferible) y devuelve la paleta dominante por
 * cuantización simple de color. Vive en el propio paquete, sin dependencias
 * externas (contrato §12.2: "dependencias incluidas en el paquete").
 */

function quantizePalette(pixels, bucketCount) {
  const buckets = new Map()

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const alpha = pixels[i + 3]
    if (alpha < 16) continue // ignora píxeles casi transparentes

    // Reduce cada canal a 4 niveles (64 de paso) para agrupar colores cercanos.
    const key = [
      Math.floor(r / 64) * 64 + 32,
      Math.floor(g / 64) * 64 + 32,
      Math.floor(b / 64) * 64 + 32,
    ].join(',')

    buckets.set(key, (buckets.get(key) || 0) + 1)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, bucketCount)
    .map(([key, count]) => {
      const [r, g, b] = key.split(',').map(Number)
      return { r, g, b, count }
    })
}

self.onmessage = (event) => {
  const { pixels, bucketCount } = event.data
  const palette = quantizePalette(pixels, bucketCount || 6)
  self.postMessage({ palette })
}
