import { after } from 'next/server'

import { readPinContentId } from '../infrastructure/supabaseWarmRepository'

import { prepareContentWarming, runWarmJobs } from './warmContentMedia'

/**
 * Calienta los vídeos de un contenido DESPUÉS de responder (`after()`), para
 * que publicar o subir un vídeo no espere a Cloudinary.
 *
 * Se lee todo ahora, con la sesión de la petición, y solo lo que ya no
 * necesita sesión (Cloudinary y la anotación con la clave de servicio) se
 * deja para después. Nunca lanza ni retrasa la respuesta: si falla, se
 * registra y queda para el botón «Calentar» o el script.
 *
 * Solo calienta contenido publicado o programado y vídeos sin calentar.
 */
export async function warmContentAfterResponse(
  contentId: string,
): Promise<void> {
  try {
    const jobs = await prepareContentWarming(contentId)

    if (jobs.length === 0) return

    after(async () => {
      try {
        await runWarmJobs(jobs)
      } catch (error) {
        console.error(error)
      }
    })
  } catch (error) {
    console.error(error)
  }
}

/** Igual, partiendo de un pin (al adjuntarle un vídeo solo se conoce el pin). */
export async function warmPinContentAfterResponse(
  pinId: string,
): Promise<void> {
  try {
    const contentId = await readPinContentId(pinId)

    if (contentId) await warmContentAfterResponse(contentId)
  } catch (error) {
    console.error(error)
  }
}
