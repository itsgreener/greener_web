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
  media: Array<{
    id: string
    kind: 'image' | 'video'
    cloudinaryPublicId: string
    slideOrder: number
  }>
}

export interface PinRepository {
  listByContentId(contentId: string): Promise<PinListItem[]>

  create(input: CreatePinInput): Promise<string>

  update(input: UpdatePinInput): Promise<string>

  delete(input: DeletePinInput): Promise<string>
}
