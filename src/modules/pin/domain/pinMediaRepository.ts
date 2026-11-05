import type {
  AttachPinImageInput,
  AttachPinVideoInput,
  DetachPinMediaInput,
} from './pinMediaSchema'

export interface PinMediaRepository {
  attachImage(input: AttachPinImageInput): Promise<string>

  attachVideo(input: AttachPinVideoInput): Promise<string>

  detach(input: DetachPinMediaInput): Promise<string>
}
