import { describe, it, expect } from 'vitest'

import {
  packageManifestSchema,
  storedPackageManifestSchema,
} from '@/modules/packages/domain/manifestSchema'
import { VALID_METADATA } from '@tests/helpers/packageFixtures'

const VALID = {
  kind: 'tool' as const,
  entrypoint: 'index.html',
  version: 1,
  requiredCapabilities: ['canvas', 'worker'],
  externalDomains: [],
  minViewport: { width: 320, height: 420 },
  metadata: VALID_METADATA,
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

describe('storedPackageManifestSchema (versiones ya guardadas)', () => {
  const WITHOUT_METADATA: Record<string, unknown> = { ...VALID }
  delete WITHOUT_METADATA.metadata

  it('acepta un manifest anterior al bloque metadata: esas versiones siguen sirviéndose', () => {
    const result = storedPackageManifestSchema.safeParse(WITHOUT_METADATA)

    expect(result.success).toBe(true)
    expect(result.data?.metadata).toBeUndefined()
  })

  it('en una SUBIDA, en cambio, el mismo manifest se rechaza', () => {
    expect(packageManifestSchema.safeParse(WITHOUT_METADATA).success).toBe(
      false,
    )
  })

  it('conserva la metadata cuando es válida', () => {
    expect(storedPackageManifestSchema.parse(VALID).metadata).toEqual(
      VALID_METADATA,
    )
  })

  it('ignora una metadata mal formada en vez de tumbar la ficha publicada', () => {
    const result = storedPackageManifestSchema.safeParse({
      ...VALID,
      metadata: { title: 42 },
    })

    expect(result.success).toBe(true)
    expect(result.data?.metadata).toBeUndefined()
  })

  it('sigue exigiendo el resto del manifest', () => {
    expect(
      storedPackageManifestSchema.safeParse({ ...VALID, entrypoint: '' })
        .success,
    ).toBe(false)
  })
})
