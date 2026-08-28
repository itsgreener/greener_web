import type {
  RegisterImageForBlockInput,
  RegisterVideoForBlockInput,
} from './mediaAssetSchema'

export interface MediaAssetRepository {
  registerImageForBlock(
    input:
      RegisterImageForBlockInput
  ): Promise<string>

  registerVideoForBlock(
    input:
      RegisterVideoForBlockInput
  ): Promise<string>
}