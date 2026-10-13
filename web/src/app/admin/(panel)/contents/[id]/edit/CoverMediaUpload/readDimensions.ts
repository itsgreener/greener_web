import type { Dimensions } from './types'

// Sugerencia automática del ratio (especificacion-final-formato-detalle.md
// §2, §4): lee las dimensiones reales del archivo elegido, en el propio
// navegador, antes de subir nada — el admin ve el <select> ya precargado
// con la opción más parecida y puede cambiarla a mano sin problema, esto
// nunca decide ni se guarda por su cuenta.
export function readImageDimensions(file: File): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(image.src)

      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    image.onerror = () => {
      URL.revokeObjectURL(image.src)

      reject(new Error('No se ha podido leer las dimensiones de la imagen.'))
    }

    image.src = URL.createObjectURL(file)
  })
}

export function readVideoDimensions(file: File): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')

    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)

      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      })
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)

      reject(new Error('No se ha podido leer las dimensiones del vídeo.'))
    }

    video.src = URL.createObjectURL(file)
  })
}
