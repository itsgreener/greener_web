import type {
  AddCaseCarouselImageInput,
  AddCaseCarouselVideoInput,
  DeleteCoverMediaInput,
  RegisterCoverImageInput,
  RegisterCoverVideoInput,
  RemoveCaseCarouselMediaInput,
} from './mediaAssetSchema'

export interface MediaAssetRepository {
  registerCoverImage(input: RegisterCoverImageInput): Promise<string>

  registerCoverVideo(input: RegisterCoverVideoInput): Promise<string>

  /**
   * Desvincula el media_asset de la portada del contenido y lo borra en
   * Postgres (solo la mitad de Postgres del flujo de sustitución — el
   * borrado en Cloudinary lo hace la capa de aplicación por separado).
   */
  unlinkAndDeleteCoverMedia(input: DeleteCoverMediaInput): Promise<string>

  addCaseCarouselImage(input: AddCaseCarouselImageInput): Promise<string>

  addCaseCarouselVideo(input: AddCaseCarouselVideoInput): Promise<string>

  removeCaseCarouselMedia(input: RemoveCaseCarouselMediaInput): Promise<string>
}
