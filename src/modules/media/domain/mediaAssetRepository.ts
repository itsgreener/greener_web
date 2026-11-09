import type {
  AddCaseCarouselImageInput,
  AddCaseCarouselVideoInput,
  RemoveCaseCarouselMediaInput,
  ReorderCaseCarouselInput,
  ReplaceCaseCarouselImageInput,
  ReplaceCaseCarouselVideoInput,
  UpdateCaseCarouselAltInput,
} from './mediaAssetSchema'

/** Lo que cambia una sustitución: la diapositiva conserva su sitio; el medio es otro. */
export type ReplaceCaseCarouselMediaInput =
  | ({ kind: 'image' } & ReplaceCaseCarouselImageInput)
  | ({ kind: 'video' } & ReplaceCaseCarouselVideoInput)

export interface MediaAssetRepository {
  addCaseCarouselImage(input: AddCaseCarouselImageInput): Promise<string>

  addCaseCarouselVideo(input: AddCaseCarouselVideoInput): Promise<string>

  removeCaseCarouselMedia(input: RemoveCaseCarouselMediaInput): Promise<string>

  /** Devuelve el id del `media_asset` nuevo; el anterior ya no existe. */
  replaceCaseCarouselMedia(
    input: ReplaceCaseCarouselMediaInput,
  ): Promise<string>

  updateCaseCarouselAlt(input: UpdateCaseCarouselAltInput): Promise<string>

  /** Devuelve cuántas diapositivas se han ordenado. */
  reorderCaseCarousel(input: ReorderCaseCarouselInput): Promise<number>
}
