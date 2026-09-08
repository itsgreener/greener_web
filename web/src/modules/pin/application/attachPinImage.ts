import {
  attachPinImageSchema,
  type AttachPinImageInput,
} from '../domain/pinMediaSchema'
import { supabasePinMediaRepository } from '../infrastructure/supabasePinMediaRepository'

export async function attachPinImage(input: AttachPinImageInput) {
  const validated = attachPinImageSchema.parse(input)

  return supabasePinMediaRepository.attachImage(validated)
}
