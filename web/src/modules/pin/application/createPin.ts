import { createPinSchema, type CreatePinInput } from '../domain/pinSchema'
import { supabasePinRepository } from '../infrastructure/supabasePinRepository'

export async function createPin(input: CreatePinInput) {
  const validated = createPinSchema.parse(input)

  return supabasePinRepository.create(validated)
}
