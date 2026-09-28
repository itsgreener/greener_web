import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import nextConfig from '../../../next.config'
import { PACKAGE_LIMITS } from '@/modules/packages/domain/packageLimits'
import {
  CLOUDMERSIVE_MAX_FILE_BYTES,
  scanZipForViruses,
  VirusScanError,
} from '@/modules/packages/infrastructure/cloudmersiveVirusScan'
import { validateHtmlPackageZip } from '@/modules/packages/infrastructure/zipValidation'

/**
 * El límite del ZIP (10 MB) sale de que el ZIP completo se envía tal cual a
 * Cloudmersive, que en cuenta gratuita solo admite hasta 10 MB. Estos
 * tests atan las tres cifras que tienen que moverse juntas
 * (packageLimits.ts, cloudmersiveVirusScan.ts y next.config.ts): si alguien
 * cambia una sin las otras, falla aquí y no en producción.
 */

// Next.js (librería `bytes`): 1 mb = 1024 * 1024
function toBytes(raw: unknown): number {
  if (typeof raw === 'number') {
    return raw
  }

  const match = /^(\d+(?:\.\d+)?)\s*mb$/i.exec(String(raw))

  if (!match) {
    throw new Error(`Tamaño con formato no soportado por el test: ${raw}`)
  }

  return Number(match[1]) * 1024 * 1024
}

function bodySizeLimitBytes(): number {
  return toBytes(nextConfig.experimental?.serverActions?.bodySizeLimit)
}

function proxyClientMaxBodySizeBytes(): number {
  return toBytes(nextConfig.experimental?.proxyClientMaxBodySize)
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('límite de tamaño del ZIP de tools/insights', () => {
  it('es de 10 MB decimales (10.000.000 bytes), lo que muestra el Finder de macOS', () => {
    expect(PACKAGE_LIMITS.maxZipSizeBytes).toBe(10_000_000)
  })

  it('no supera nunca el máximo que admite el servicio de antivirus', () => {
    expect(PACKAGE_LIMITS.maxZipSizeBytes).toBeLessThanOrEqual(
      CLOUDMERSIVE_MAX_FILE_BYTES,
    )
  })

  it('el cuerpo máximo de la Server Action es igual o mayor que el límite del ZIP', () => {
    expect(bodySizeLimitBytes()).toBeGreaterThanOrEqual(
      PACKAGE_LIMITS.maxZipSizeBytes,
    )
  })

  it('el tope de copia del proxy es igual o mayor que el de las Server Actions (si no, Next trunca el cuerpo en silencio)', () => {
    expect(proxyClientMaxBodySizeBytes()).toBeGreaterThanOrEqual(
      bodySizeLimitBytes(),
    )
  })

  it('el tope de copia del proxy deja sitio a un ZIP de exactamente el límite más la cabecera multipart', () => {
    expect(proxyClientMaxBodySizeBytes()).toBeGreaterThan(
      PACKAGE_LIMITS.maxZipSizeBytes + 1024 * 1024,
    )
  })

  it('el validador rechaza un byte por encima con el mensaje claro «10 MB»', () => {
    const buffer = Buffer.alloc(PACKAGE_LIMITS.maxZipSizeBytes + 1)

    expect(() => validateHtmlPackageZip(buffer)).toThrow(
      'El ZIP supera el límite de 10 MB.',
    )
  })

  it('el validador NO rechaza por tamaño un fichero de exactamente el límite', () => {
    const buffer = Buffer.alloc(PACKAGE_LIMITS.maxZipSizeBytes)

    // No es un ZIP válido, pero el motivo del rechazo ya no es el tamaño.
    expect(() => validateHtmlPackageZip(buffer)).toThrow(/no es un ZIP válido/)
    expect(() => validateHtmlPackageZip(buffer)).not.toThrow(/supera/)
  })
})

describe('guarda de tamaño en scanZipForViruses', () => {
  it('rechaza un ZIP mayor que el tope del antivirus SIN enviarlo (bloqueante, mensaje claro)', async () => {
    const buffer = Buffer.alloc(CLOUDMERSIVE_MAX_FILE_BYTES + 1)

    await expect(scanZipForViruses(buffer)).rejects.toBeInstanceOf(
      VirusScanError,
    )
    await expect(scanZipForViruses(buffer)).rejects.toThrow(/10 MB/)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('un ZIP de exactamente el tope sí se envía a escanear', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ CleanResult: true }),
    } as unknown as Response)

    await expect(
      scanZipForViruses(Buffer.alloc(CLOUDMERSIVE_MAX_FILE_BYTES)),
    ).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledOnce()
  })
})
