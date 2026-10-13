import type { ContentStatus } from '@/modules/shared/domain/contentStatus'
import type { VideoUsage } from './warmPlan'

export interface WarmCandidate {
  mediaId: string
  cloudinaryPublicId: string
  warmedContract: string | null
  usages: VideoUsage[]
}

export interface ContentWarmInfo {
  status: ContentStatus
  candidates: WarmCandidate[]
}

/** Anota que un vídeo quedó calentado con un contrato (o que falló). */
export type WarmMarker = (
  mediaId: string,
  contract: string,
  error?: string | null,
) => Promise<void>

export interface WarmRepository {
  readContentWarmInfo(contentId: string): Promise<ContentWarmInfo>

  /** Contenido al que pertenece un pin (null si el pin ya no existe). */
  readPinContentId(pinId: string): Promise<string | null>

  /** Anota con la sesión de quien llama (botón del ABM). */
  markWithSession: WarmMarker

  /** Anota con la clave de servicio (tareas diferidas, sin sesión fiable). */
  markWithService: WarmMarker
}
