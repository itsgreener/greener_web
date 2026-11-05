import { describe, it, expect } from 'vitest'

import {
  ASSET_CACHE_CONTROL,
  buildAssetEtag,
  isNotModified,
} from '@/modules/packages/domain/assetCaching'

describe('ASSET_CACHE_CONTROL', () => {
  it('obliga a revalidar y nunca declara el asset immutable (la URL no lleva versión)', () => {
    expect(ASSET_CACHE_CONTROL).toContain('no-cache')
    expect(ASSET_CACHE_CONTROL).not.toContain('immutable')
    expect(ASSET_CACHE_CONTROL).not.toMatch(/max-age=[1-9]/)
  })
})

describe('buildAssetEtag', () => {
  it('envuelve el checksum entre comillas, como exige el formato de ETag', () => {
    expect(buildAssetEtag('abc123')).toBe('"abc123"')
  })

  it('es distinto para checksums distintos (versión nueva o rollback)', () => {
    expect(buildAssetEtag('v1')).not.toBe(buildAssetEtag('v2'))
  })
})

describe('isNotModified', () => {
  const etag = buildAssetEtag('abc123')

  it('coincide cuando el navegador manda el mismo ETag', () => {
    expect(isNotModified('"abc123"', etag)).toBe(true)
  })

  it('no coincide con el ETag de otra versión', () => {
    expect(isNotModified('"otra"', etag)).toBe(false)
  })

  it('no coincide si no hay cabecera', () => {
    expect(isNotModified(null, etag)).toBe(false)
    expect(isNotModified(undefined, etag)).toBe(false)
    expect(isNotModified('', etag)).toBe(false)
  })

  it('acepta la forma débil W/ (algunos proxies la añaden)', () => {
    expect(isNotModified('W/"abc123"', etag)).toBe(true)
  })

  it('acepta una lista de ETags y encuentra el bueno en cualquier posición', () => {
    expect(isNotModified('"x", "abc123", "y"', etag)).toBe(true)
    expect(isNotModified('"x", "y"', etag)).toBe(false)
  })

  it('acepta el comodín *', () => {
    expect(isNotModified('*', etag)).toBe(true)
  })
})
