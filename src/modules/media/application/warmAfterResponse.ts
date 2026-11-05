import type { WarmRepository } from '@/modules/media/domain/warmRepository'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'
import type { ContentWarming } from './warmContentMedia'

/**
 * Calienta los vídeos de un contenido DESPUÉS de responder (`defer`, que en
 * producción es `after()` de Next), para
 * que publicar o subir un vídeo no espere a Cloudinary.
 *
 * Se lee todo ahora, con la sesión de la petición, y solo lo que ya no
 * necesita sesión (Cloudinary y la anotación con la clave de servicio) se
 * deja para después. Nunca lanza ni retrasa la respuesta: si falla, se
 * registra y queda para el botón «Calentar» o el script.
 *
 * Solo calienta contenido publicado o programado y vídeos sin calentar.
 */
export function makeWarmScheduler({
  warming,
  warmRepo,
  defer,
}: {
  warming: Pick<ContentWarming, 'prepareContentWarming' | 'runWarmJobs'>
  warmRepo: Pick<WarmRepository, 'readPinContentId'>
  /** Ejecuta la tarea una vez enviada la respuesta. */
  defer: (task: () => Promise<void>) => void
}): WarmScheduler {
  async function forContent(contentId: string): Promise<void> {
    try {
      const jobs = await warming.prepareContentWarming(contentId)

      if (jobs.length === 0) return

      defer(async () => {
        try {
          await warming.runWarmJobs(jobs)
        } catch (error) {
          console.error(error)
        }
      })
    } catch (error) {
      console.error(error)
    }
  }

  async function forPin(pinId: string): Promise<void> {
    try {
      const contentId = await warmRepo.readPinContentId(pinId)

      if (contentId) await forContent(contentId)
    } catch (error) {
      console.error(error)
    }
  }

  return { forContent, forPin }
}
