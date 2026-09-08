import {
  attachPinVideoSchema,
  type AttachPinVideoInput,
} from '../domain/pinMediaSchema'
import { supabasePinMediaRepository } from '../infrastructure/supabasePinMediaRepository'

export async function attachPinVideo(input: AttachPinVideoInput) {
  const validated = attachPinVideoSchema.parse(input)

  return supabasePinMediaRepository.attachVideo(validated)
}
