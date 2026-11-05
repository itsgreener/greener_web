// @vitest-environment jsdom
import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

import ContentFilterBar from '@/app/admin/(panel)/contents/ContentFilterBar'
import { usePersistedFilters } from '@/app/admin/_lib/usePersistedFilters'

const KEY = 'test.filters'
const KEYS = ['q', 'type', 'status', 'page'] as const

function setup(search: string, clear = false) {
  return renderHook(() =>
    usePersistedFilters({
      storageKey: KEY,
      listPath: '/admin/contents',
      filterKeys: KEYS,
      search,
      clear,
    }),
  )
}

beforeEach(() => {
  replace.mockClear()
  window.sessionStorage.clear()
})

afterEach(() => {
  window.sessionStorage.clear()
})

describe('usePersistedFilters', () => {
  it('con filtros en la URL los guarda y no redirige', () => {
    setup('q=agro&status=draft&page=2&otro=x')

    expect(window.sessionStorage.getItem(KEY)).toBe(
      'q=agro&status=draft&page=2',
    )
    expect(replace).not.toHaveBeenCalled()
  })

  it('sin filtros en la URL restaura los guardados', () => {
    window.sessionStorage.setItem(KEY, 'q=agro&page=3')

    setup('')

    expect(replace).toHaveBeenCalledWith('/admin/contents?q=agro&page=3')
  })

  it('sin filtros ni nada guardado no hace nada', () => {
    setup('')

    expect(replace).not.toHaveBeenCalled()
  })

  it('con `clear` olvida lo guardado y limpia la URL', () => {
    window.sessionStorage.setItem(KEY, 'q=agro')

    setup('', true)

    expect(window.sessionStorage.getItem(KEY)).toBeNull()
    expect(replace).toHaveBeenCalledWith('/admin/contents')
  })

  it('si el almacenamiento falla, no lanza', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => setup('q=agro')).not.toThrow()
    expect(() => setup('')).not.toThrow()

    vi.restoreAllMocks()
  })
})

describe('ContentFilterBar', () => {
  it('al enviar guarda los filtros recortados y sin la página', () => {
    window.sessionStorage.setItem(KEY, 'stale')

    render(
      <ContentFilterBar search="" clear={false}>
        <input name="q" defaultValue="  agro  " aria-label="Buscar" />
        <input name="type" defaultValue="" aria-label="Tipo" />
        <input name="page" defaultValue="4" aria-label="Página" />
        <button type="submit">Filtrar</button>
      </ContentFilterBar>,
    )

    // El formulario hace un GET real: jsdom no lo implementa y no importa aquí.
    const form = screen
      .getByRole('button', { name: 'Filtrar' })
      .closest('form')!
    form.addEventListener('submit', (event) => event.preventDefault())

    fireEvent.submit(form)

    expect(window.sessionStorage.getItem('admin.contents.filters.v1')).toBe(
      'q=agro',
    )
  })

  it('al enviar sin ningún filtro borra lo guardado', () => {
    window.sessionStorage.setItem('admin.contents.filters.v1', 'q=viejo')

    render(
      <ContentFilterBar search="q=viejo" clear={false}>
        <input name="q" defaultValue="" aria-label="Buscar" />
        <button type="submit">Filtrar</button>
      </ContentFilterBar>,
    )

    const form = screen
      .getByRole('button', { name: 'Filtrar' })
      .closest('form')!
    form.addEventListener('submit', (event) => event.preventDefault())

    fireEvent.submit(form)

    expect(
      window.sessionStorage.getItem('admin.contents.filters.v1'),
    ).toBeNull()
  })
})
