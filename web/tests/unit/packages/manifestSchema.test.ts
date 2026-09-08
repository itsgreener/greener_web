import { describe, it, expect } from 'vitest'

import { packageManifestSchema } from '@/modules/packages/domain/manifestSchema'

const VALID = {
  kind: 'tool' as const,
  entrypoint: 'index.html',
  version: 1,
  requiredCapabilities: ['canvas', 'worker'],
  externalDomains: [],
  minViewport: { width: 320, height: 420 },
}

describe('packageManifestSchema', () => {
  it('acepta un manifest válido de tool', () => {
    expect(packageManifestSchema.safeParse(VALID).success).toBe(true)
  })

  it('acepta kind insight', () => {
    expect(
      packageManifestSchema.safeParse({ ...VALID, kind: 'insight' }).success,
    ).toBe(true)
  })

  it('rechaza un kind que no sea tool ni insight', () => {
    expect(
      packageManifestSchema.safeParse({ ...VALID, kind: 'page' }).success,
    ).toBe(false)
  })

  it('rechaza entrypoint vacío', () => {
    expect(
      packageManifestSchema.safeParse({ ...VALID, entrypoint: '' }).success,
    ).toBe(false)
  })

  it('rechaza version no entero o no positivo', () => {
    expect(
      packageManifestSchema.safeParse({ ...VALID, version: 1.5 }).success,
    ).toBe(false)
    expect(
      packageManifestSchema.safeParse({ ...VALID, version: 0 }).success,
    ).toBe(false)
  })

  it('acepta requiredCapabilities y externalDomains vacíos', () => {
    const result = packageManifestSchema.safeParse({
      ...VALID,
      requiredCapabilities: [],
      externalDomains: [],
    })

    expect(result.success).toBe(true)
  })

  it('rechaza minViewport incompleto', () => {
    expect(
      packageManifestSchema.safeParse({ ...VALID, minViewport: { width: 320 } })
        .success,
    ).toBe(false)
  })

  it('rechaza minViewport con dimensiones no positivas', () => {
    expect(
      packageManifestSchema.safeParse({
        ...VALID,
        minViewport: { width: 0, height: 420 },
      }).success,
    ).toBe(false)
  })
})
