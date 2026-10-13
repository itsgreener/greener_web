import type { VideoProfile } from './mediaDelivery'
import type { WarmSize } from './warmPlan'

/**
 * Pide al almacén de medios que prepare, de forma asíncrona, las versiones de
 * un vídeo que la web va a servir.
 */
export interface VideoWarmer {
  /** Cadenas de transformación de las rendiciones de un perfil y tamaño. */
  transformationsFor(profile: VideoProfile, size: WarmSize): string[]

  warm(publicId: string, transformations: string[]): Promise<void>
}
