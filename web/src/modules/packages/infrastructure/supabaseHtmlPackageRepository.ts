import { createClient } from '@/lib/supabase/server'

import type {
  HtmlPackageRepository,
  HtmlPackageVersionSummary,
  PublishHtmlPackageVersionInput,
  UploadHtmlPackageVersionInput,
} from '../domain/htmlPackageRepository'

const BUCKET = 'html-packages'

function createRepositoryError(message: string, code?: string) {
  const error = new Error(message) as Error & {
    code?: string
  }

  error.code = code

  return error
}

function contentTypeFor(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''

  const types: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    mjs: 'text/javascript; charset=utf-8',
    css: 'text/css; charset=utf-8',
    json: 'application/json; charset=utf-8',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    woff: 'font/woff',
    woff2: 'font/woff2',
  }

  return types[extension] ?? 'application/octet-stream'
}

export const supabaseHtmlPackageRepository: HtmlPackageRepository = {
  async uploadVersion(input: UploadHtmlPackageVersionInput) {
    const supabase = await createClient()

    const { data: existing, error: maxVersionError } = await supabase
      .from('html_package_version')
      .select('version')
      .eq('package_id', input.contentId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (maxVersionError) {
      throw createRepositoryError(maxVersionError.message, maxVersionError.code)
    }

    const version = (existing?.version ?? 0) + 1
    const basePath = `${input.contentId}/v${version}`

    for (const entry of input.entries) {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(`${basePath}/${entry.path}`, entry.data, {
          contentType: contentTypeFor(entry.path),
          upsert: false,
        })

      if (uploadError) {
        throw createRepositoryError(
          `Fallo subiendo "${entry.path}" a Storage: ${uploadError.message}`,
        )
      }
    }

    const { data, error } = await supabase.rpc('create_html_package_version', {
      p_content_id: input.contentId,
      p_version: version,
      p_storage_path: basePath,
      p_checksum: input.checksum,
      p_manifest: input.manifest,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async publishVersion(input: PublishHtmlPackageVersionInput) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('publish_html_package_version', {
      p_content_id: input.contentId,
      p_version_id: input.versionId,
    })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return data as string
  },

  async listVersions(contentId: string): Promise<HtmlPackageVersionSummary[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('html_package_version')
      .select('id, version, status, created_at, storage_path')
      .eq('package_id', contentId)
      .order('version', { ascending: false })

    if (error) {
      throw createRepositoryError(error.message, error.code)
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      version: row.version,
      status: row.status,
      createdAt: row.created_at,
      storagePath: row.storage_path,
    }))
  },
}
