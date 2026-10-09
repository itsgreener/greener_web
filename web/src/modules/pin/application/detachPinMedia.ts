import {
  detachPinMediaSchema,
  type DetachPinMediaInput,
} from '../domain/pinMediaSchema'
import { supabasePinMediaRepository } from '../infrastructure/supabasePinMediaRepository'

export async function detachPinMedia(input: DetachPinMediaInput) {
  const validated = detachPinMediaSchema.parse(input)

  return supabasePinMediaRepository.detach(validated)
}
