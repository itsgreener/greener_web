import type {
  DeleteBlockMediaInput,
  RegisterImageForBlockInput,
  RegisterVideoForBlockInput,
} from './mediaAssetSchema'

export interface MediaAssetRepository {
  registerImageForBlock(input: RegisterImageForBlockInput): Promise<string>

  registerVideoForBlock(input: RegisterVideoForBlockInput): Promise<string>

  /**
   * Desvincula el media_asset del bloque y lo borra en Postgres (solo la
   * mitad de Postgres del flujo de sustitución — el borrado en Cloudinary
   * lo hace la capa de aplicación por separado, ver deleteBlockMedia.ts).
   */
  unlinkAndDelete(input: DeleteBlockMediaInput): Promise<string>
}
