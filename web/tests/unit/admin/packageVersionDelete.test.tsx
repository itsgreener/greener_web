// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const deleteHtmlPackageVersion = vi.fn()
const deleteOldHtmlPackageVersions = vi.fn()

vi.mock('@/modules/packages/application/deleteHtmlPackageVersion', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/packages/application/deleteHtmlPackageVersion')
  >('@/modules/packages/application/deleteHtmlPackageVersion')

  return {
    ...actual,
    deleteHtmlPackageVersion: (...args: unknown[]) =>
      deleteHtmlPackageVersion(...args),
    deleteOldHtmlPackageVersions: (...args: unknown[]) =>
      deleteOldHtmlPackageVersions(...args),
  }
})

vi.mock('@/modules/packages/application/uploadHtmlPackage', () => ({
  uploadHtmlPackage: vi.fn(),
}))
vi.mock('@/modules/packages/application/publishHtmlPackageVersion', () => ({
  publishHtmlPackageVersion: vi.fn(),
  publishHtmlPackageVersionSchema: { safeParse: vi.fn() },
}))
vi.mock('@/modules/packages/infrastructure/zipValidation', () => ({
  PackageValidationError: class extends Error {},
}))
vi.mock('@/modules/packages/infrastructure/cloudmersiveVirusScan', () => ({
  VirusScanError: class extends Error {},
}))

import {
  deleteHtmlPackageVersionAction,
  deleteOldHtmlPackageVersionsAction,
} from '@/app/admin/contents/[id]/edit/packageActions'
import PackageUpload from '@/app/admin/contents/[id]/edit/PackageUpload'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'
const VERSION_ID = '9f8e7d6c-5b4a-4f2e-8d0c-b9a8f7e6d5c4'

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields)) data.set(key, value)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('deleteHtmlPackageVersionAction', () => {
  it('borra y devuelve success', async () => {
    deleteHtmlPackageVersion.mockResolvedValue({
      storagePath: 'x',
      storageFailed: 0,
    })

    const state = await deleteHtmlPackageVersionAction(
      {},
      form({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    )

    expect(state).toEqual({ success: true })
  })

  it('avisa si quedaron ficheros huérfanos en Storage', async () => {
    deleteHtmlPackageVersion.mockResolvedValue({
      storagePath: 'x',
      storageFailed: 4,
    })

    const state = await deleteHtmlPackageVersionAction(
      {},
      form({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    )

    expect(state.success).toBe(true)
    expect(state.warning).toContain('4 fichero(s)')
  })

  it('muestra tal cual el rechazo de la base de datos (P0001), p. ej. la versión activa', async () => {
    deleteHtmlPackageVersion.mockRejectedValue(
      Object.assign(new Error('No se puede borrar la versión activa.'), {
        code: 'P0001',
      }),
    )

    const state = await deleteHtmlPackageVersionAction(
      {},
      form({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    )

    expect(state.error).toBe('No se puede borrar la versión activa.')
  })

  it('un error cualquiera no filtra su texto', async () => {
    deleteHtmlPackageVersion.mockRejectedValue(new Error('secreto interno'))

    const state = await deleteHtmlPackageVersionAction(
      {},
      form({ contentId: CONTENT_ID, versionId: VERSION_ID }),
    )

    expect(state.error).toBe('No se ha podido borrar la versión.')
  })

  it('ids inválidos no llegan a la capa de aplicación', async () => {
    const state = await deleteHtmlPackageVersionAction(
      {},
      form({ contentId: 'x', versionId: 'y' }),
    )

    expect(state.error).toBe('Los datos de la versión no son válidos.')
    expect(deleteHtmlPackageVersion).not.toHaveBeenCalled()
  })
})

describe('deleteOldHtmlPackageVersionsAction', () => {
  it('éxito', async () => {
    deleteOldHtmlPackageVersions.mockResolvedValue({
      deleted: 2,
      total: 2,
      storageFailed: 0,
    })

    expect(
      await deleteOldHtmlPackageVersionsAction(
        {},
        form({ contentId: CONTENT_ID }),
      ),
    ).toEqual({ success: true })
  })

  it('si se detuvo a mitad, dice cuántas se borraron', async () => {
    deleteOldHtmlPackageVersions.mockResolvedValue({
      deleted: 1,
      total: 3,
      storageFailed: 0,
      error: new Error('boom'),
    })

    const state = await deleteOldHtmlPackageVersionsAction(
      {},
      form({ contentId: CONTENT_ID }),
    )

    expect(state.error).toContain('Se han borrado 1 de 3 versiones anteriores')
  })

  it('sin versiones anteriores lo dice', async () => {
    deleteOldHtmlPackageVersions.mockResolvedValue({
      deleted: 0,
      total: 0,
      storageFailed: 0,
    })

    const state = await deleteOldHtmlPackageVersionsAction(
      {},
      form({ contentId: CONTENT_ID }),
    )

    expect(state.error).toBe('No hay versiones anteriores que borrar.')
  })

  it('avisa de ficheros huérfanos', async () => {
    deleteOldHtmlPackageVersions.mockResolvedValue({
      deleted: 2,
      total: 2,
      storageFailed: 3,
    })

    const state = await deleteOldHtmlPackageVersionsAction(
      {},
      form({ contentId: CONTENT_ID }),
    )

    expect(state.success).toBe(true)
    expect(state.warning).toContain('3 fichero(s)')
  })
})

describe('PackageUpload — borrar versiones', () => {
  const version = (
    n: number,
    status: 'draft' | 'published' | 'rolled_back',
  ) => ({
    id: `00000000-0000-4000-8000-00000000000${n}`,
    version: n,
    status,
    createdAt: '2026-10-07T10:00:00Z',
    storagePath: `${CONTENT_ID}/v${n}`,
  })

  it('la versión activa NO se puede borrar; borradores y anteriores sí', () => {
    render(
      <PackageUpload
        contentId={CONTENT_ID}
        versions={[
          version(4, 'draft'),
          version(3, 'published'),
          version(2, 'rolled_back'),
        ]}
      />,
    )

    const rowOf = (label: string) =>
      screen.getByText(label).closest('tr') as HTMLElement

    expect(rowOf('v3').textContent).toContain('Activa')
    expect(rowOf('v3').textContent).not.toContain('Borrar versión')
    expect(rowOf('v4').textContent).toContain('Borrar versión')
    expect(rowOf('v2').textContent).toContain('Borrar versión')
    expect(rowOf('v2').textContent).toContain('Volver a esta versión')
  })

  it('«Borrar versiones anteriores» cuenta solo las rolled_back y no sale si no hay', () => {
    const { unmount } = render(
      <PackageUpload
        contentId={CONTENT_ID}
        versions={[
          version(4, 'draft'),
          version(3, 'published'),
          version(2, 'rolled_back'),
          version(1, 'rolled_back'),
        ]}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Borrar versiones anteriores (2)' }),
    ).toBeInTheDocument()

    unmount()

    render(
      <PackageUpload
        contentId={CONTENT_ID}
        versions={[version(2, 'draft'), version(1, 'published')]}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /Borrar versiones anteriores/ }),
    ).toBeNull()
  })

  it('pide confirmación y, si se cancela, no envía el formulario', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <PackageUpload
        contentId={CONTENT_ID}
        versions={[version(2, 'published'), version(1, 'rolled_back')]}
      />,
    )

    const row = screen.getByText('v1').closest('tr') as HTMLElement

    fireEvent.click(
      Array.from(row.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Borrar versión'),
      ) as HTMLButtonElement,
    )

    await waitFor(() =>
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('versión v1'),
      ),
    )
    expect(deleteHtmlPackageVersion).not.toHaveBeenCalled()
  })
})
