import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * SEC-T4: el cliente con la secret key salta RLS. Esta es la lista cerrada de
 * módulos que pueden importarlo; añadir uno obliga a tocar este test y, con
 * él, a justificarlo en la revisión.
 */
const ALLOWED_IMPORTERS = [
  'src/lib/supabase/serviceClient.ts',
  'src/modules/audit/infrastructure/serviceAuditRecorder.ts',
  'src/modules/contact/infrastructure/contactSubmissionLog.ts',
  'src/modules/content/container.ts',
  'src/modules/feed/infrastructure/feedSessionRepository.ts',
  'src/modules/media/infrastructure/supabaseWarmRepository.ts',
  'src/modules/packages/infrastructure/supabaseStagedUploadSweeper.ts',
  'src/modules/packages/infrastructure/supabaseStorageSource.ts',
].sort()

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)

    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

describe('SEC-T4: importadores de createServiceClient', () => {
  const found = walk(path.join(process.cwd(), 'src'))
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) =>
      /\bcreateServiceClient\b/.test(readFileSync(file, 'utf8')),
    )
    .map((file) => path.relative(process.cwd(), file).split(path.sep).join('/'))
    .sort()

  it('solo lo usan los módulos autorizados', () => {
    expect(found).toEqual(ALLOWED_IMPORTERS)
  })

  it('ningún componente cliente lo importa', () => {
    for (const file of found) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8')

      expect(source, file).not.toMatch(/^(['"])use client\1/m)
    }
  })
})
