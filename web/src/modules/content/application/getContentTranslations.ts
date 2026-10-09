import { supabaseContentTranslationRepository } from '../infrastructure/supabaseContentTranslationRepository'

export async function getContentTranslations(contentId: string) {
  return supabaseContentTranslationRepository.listByContentId(contentId)
}
