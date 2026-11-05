import type {
  AddCaseCarouselImageInput,
  AddCaseCarouselVideoInput,
  RemoveCaseCarouselMediaInput,
} from './mediaAssetSchema'

export interface MediaAssetRepository {
  addCaseCarouselImage(input: AddCaseCarouselImageInput): Promise<string>

  addCaseCarouselVideo(input: AddCaseCarouselVideoInput): Promise<string>

  removeCaseCarouselMedia(input: RemoveCaseCarouselMediaInput): Promise<string>
}
