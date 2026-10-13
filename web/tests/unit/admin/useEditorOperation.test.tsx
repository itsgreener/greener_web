// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const refreshRouter = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => refreshRouter() }),
}))

import {
  resetEditorLockForTests,
  useEditorBusy,
} from '@/app/admin/(panel)/contents/[id]/edit/editorLock'
import {
  useEditorOperation,
  useEditorRefresh,
} from '@/app/admin/(panel)/contents/[id]/edit/useEditorOperation'

function setup() {
  const setError = vi.fn()
  const setWarning = vi.fn()

  const hook = renderHook(() => ({
    operation: useEditorOperation({ setError, setWarning }),
    busy: useEditorBusy(),
  }))

  return { ...hook, setError, setWarning }
}

beforeEach(() => {
  vi.clearAllMocks()
  resetEditorLockForTests()
})

afterEach(() => {
  resetEditorLockForTests()
})

describe('useEditorOperation', () => {
  it('con éxito: refresca la página y libera el cerrojo', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.operation.run(
        async () => ({ ok: true }),
        () => ({}),
      )
    })

    expect(refreshRouter).toHaveBeenCalledTimes(1)
    expect(result.current.busy).toBe(false)
    expect(result.current.operation.pending).toBe(false)
  })

  it('con error del servidor: lo muestra, no refresca y libera el cerrojo', async () => {
    const { result, setError } = setup()

    await act(async () => {
      await result.current.operation.run(
        async () => ({ ok: false }),
        () => ({ error: 'Falló' }),
      )
    })

    expect(setError).toHaveBeenLastCalledWith('Falló')
    expect(refreshRouter).not.toHaveBeenCalled()
    expect(result.current.busy).toBe(false)
  })

  it('si la acción lanza, muestra el mensaje genérico y no refresca', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, setError } = setup()

    await act(async () => {
      await result.current.operation.run(
        async () => {
          throw new Error('red caída')
        },
        () => ({}),
      )
    })

    expect(setError).toHaveBeenLastCalledWith(
      'No se ha podido completar la operación.',
    )
    expect(refreshRouter).not.toHaveBeenCalled()
    expect(result.current.busy).toBe(false)

    consoleError.mockRestore()
  })

  it('con aviso: lo muestra y refresca', async () => {
    const { result, setWarning } = setup()

    await act(async () => {
      await result.current.operation.run(
        async () => ({}),
        () => ({ warning: 'Un archivo no se pudo borrar' }),
      )
    })

    expect(setWarning).toHaveBeenLastCalledWith('Un archivo no se pudo borrar')
    expect(refreshRouter).toHaveBeenCalledTimes(1)
  })

  it('con aviso y keepWarningVisible: lo muestra y NO refresca', async () => {
    const { result, setWarning } = setup()

    await act(async () => {
      await result.current.operation.run(
        async () => ({}),
        () => ({ warning: 'Léelo', keepWarningVisible: true }),
      )
    })

    expect(setWarning).toHaveBeenLastCalledWith('Léelo')
    expect(refreshRouter).not.toHaveBeenCalled()
  })
})

describe('useEditorRefresh', () => {
  it('refresca y no deja el cerrojo tomado al terminar', async () => {
    const { result } = renderHook(() => ({
      refresh: useEditorRefresh(),
      busy: useEditorBusy(),
    }))

    await act(async () => result.current.refresh())

    expect(refreshRouter).toHaveBeenCalledTimes(1)
    expect(result.current.busy).toBe(false)
  })
})
