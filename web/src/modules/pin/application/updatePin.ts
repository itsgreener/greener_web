import { updatePinSchema, type UpdatePinInput } from '../domain/pinSchema'
import { supabasePinRepository } from '../infrastructure/supabasePinRepository'

export async function updatePin(input: UpdatePinInput) {
  const validated = updatePinSchema.parse(input)

  return supabasePinRepository.update(validated)
}
