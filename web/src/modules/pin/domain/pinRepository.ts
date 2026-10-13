import type {
  CreatePinInput,
  DeletePinInput,
  UpdatePinInput,
} from './pinSchema'

export type PinListItem = {
  id: string
  contentId: string
  ratio: string
  label: string | null
  language: string
  autoplayMode: 'viewport' | 'hover' | null
  alt: string
  createdAt: string
  /** Un pin es un único medio; `null` mientras no se ha subido. */
  media: {
    id: string
    kind: 'image' | 'video'
    cloudinaryPublicId: string
  } | null
}

export interface PinRepository {
  listByContentId(contentId: string): Promise<PinListItem[]>

  create(input: CreatePinInput): Promise<string>

  update(input: UpdatePinInput): Promise<string>

  delete(input: DeletePinInput): Promise<string>
}
