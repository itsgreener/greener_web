import { deletePinSchema, type DeletePinInput } from '../domain/pinSchema'
import { supabasePinRepository } from '../infrastructure/supabasePinRepository'

export async function deletePin(input: DeletePinInput) {
  const validated = deletePinSchema.parse(input)

  return supabasePinRepository.delete(validated)
}
