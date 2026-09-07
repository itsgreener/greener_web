import { supabaseContentRepository } from '../infrastructure/supabaseContentRepository'

export async function getContent(id: string) {
  return supabaseContentRepository.getById(id)
}
