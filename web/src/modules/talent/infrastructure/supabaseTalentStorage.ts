import 'server-only'

import { CV_BUCKET } from '@/modules/talent/domain/talentConstants'
import type { TalentFileStorage } from '@/modules/talent/domain/talentPorts'

import { getTalentClient } from './talentSupabaseClient'

/** Bucket privado `cvs`: es solo tránsito, n8n mueve cada fichero a Drive. */
export const supabaseTalentStorage: TalentFileStorage = {
  async upload(path, bytes, contentType) {
    const { error } = await getTalentClient()
      .storage.from(CV_BUCKET)
      .upload(path, bytes, { contentType, upsert: false })

    if (error)
      throw new Error(`Supabase-talent (storage.upload): ${error.message}`)
  },

  async remove(path) {
    const { error } = await getTalentClient()
      .storage.from(CV_BUCKET)
      .remove([path])

    if (error)
      throw new Error(`Supabase-talent (storage.remove): ${error.message}`)
  },

  async createSignedUrl(path, expiresInSeconds) {
    const { data, error } = await getTalentClient()
      .storage.from(CV_BUCKET)
      .createSignedUrl(path, expiresInSeconds)

    if (error || !data?.signedUrl) {
      throw new Error(
        `Supabase-talent (storage.createSignedUrl): ${error?.message ?? 'sin URL'}`,
      )
    }

    return data.signedUrl
  },
}
