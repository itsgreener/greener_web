import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  scanZipForViruses,
  VirusScanError,
} from '@/modules/packages/infrastructure/cloudmersiveVirusScan'

function fakeResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => body,
  } as unknown as Response
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('scanZipForViruses', () => {
  it('resuelve sin lanzar cuando CleanResult es true', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: true }))

    await expect(
      scanZipForViruses(Buffer.from('contenido')),
    ).resolves.toBeUndefined()
  })

  it('envía el ZIP como multipart a la URL de Cloudmersive con la Apikey', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: true }))

    await scanZipForViruses(Buffer.from('contenido'))

    expect(fetch).toHaveBeenCalledOnce()
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.cloudmersive.com/virus/scan/file')
    expect(init?.method).toBe('POST')
    expect((init?.headers as Record<string, string>).Apikey).toBe(
      'test-cloudmersive-key',
    )
    expect(init?.body).toBeInstanceOf(FormData)
  })

  it('lanza VirusScanError con los nombres de virus si CleanResult es false', async () => {
    vi.mocked(fetch).mockResolvedValue(
      fakeResponse({
        CleanResult: false,
        FoundViruses: [{ FileName: 'main.js', VirusName: 'EICAR-Test-File' }],
      }),
    )

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      /EICAR-Test-File/,
    )
  })

  it('lanza VirusScanError si CleanResult es false sin detalle de virus', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({ CleanResult: false }))

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })

  it('lanza VirusScanError si la respuesta HTTP no es ok (servicio caído/límite alcanzado)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      fakeResponse({}, { ok: false, status: 503 }),
    )

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })

  it('lanza VirusScanError si fetch falla (sin red) — bloqueante, no se traga el error', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })

  it('lanza VirusScanError si la respuesta no es JSON válido', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('not json')
      },
    } as unknown as Response)

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })

  it('CleanResult ausente (no true, no false) también se trata como no confirmado limpio — nunca se abre en fallo', async () => {
    vi.mocked(fetch).mockResolvedValue(fakeResponse({}))

    await expect(scanZipForViruses(Buffer.from('x'))).rejects.toThrow(
      VirusScanError,
    )
  })
})
