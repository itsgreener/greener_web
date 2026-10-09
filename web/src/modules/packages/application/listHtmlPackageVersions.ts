import { supabaseHtmlPackageRepository } from '../infrastructure/supabaseHtmlPackageRepository'

export async function listHtmlPackageVersions(contentId: string) {
  return supabaseHtmlPackageRepository.listVersions(contentId)
}
