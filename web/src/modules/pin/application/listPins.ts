import { supabasePinRepository } from '../infrastructure/supabasePinRepository'

export async function listPins(contentId: string) {
  return supabasePinRepository.listByContentId(contentId)
}
