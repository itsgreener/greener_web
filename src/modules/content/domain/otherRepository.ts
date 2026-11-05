import type {
  CreateOtherInput,
  OtherDetail,
  UpdateOtherFrequencyInput,
} from './otherSchema'

export interface OtherRepository {
  getByContentId(contentId: string): Promise<OtherDetail | null>

  /**
   * Frecuencias de los `other` publicados, para estimar la ocupación del
   * feed. `excludeContentId` deja fuera al que se está editando.
   */
  listPublishedFrequencies(excludeContentId?: string): Promise<number[]>

  /** Crea el contenido `other` con su subtipo y su frecuencia, de una vez. */
  createDraft(input: CreateOtherInput): Promise<string>

  updateFrequency(input: UpdateOtherFrequencyInput): Promise<string>
}
