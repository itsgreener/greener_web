import { supabaseContentRepository } from '../infrastructure/supabaseContentRepository'

export async function listContents() {
  return supabaseContentRepository.list()
}
