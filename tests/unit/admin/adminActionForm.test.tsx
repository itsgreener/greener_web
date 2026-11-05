// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  AdminActionForm,
  AdminActionFormView,
  confirmSubmit,
  type AdminActionState,
} from '@/components/admin/AdminActionForm'

/**
 * El formulario genérico del ABM (ADM-A1 de la auditoría TSX): un solo sitio
 * para campos ocultos, confirmación, texto de «pendiente» y mensajes. Los
 * flujos destructivos (borrar contenido, candidato, versiones) dependen de que
 * la confirmación cancele de verdad el envío.
 */
const action =
  vi.fn<
    (
      previous: AdminActionState,
      formData: FormData,
    ) => Promise<AdminActionState>
  >()

beforeEach(() => {
  action.mockReset()
  action.mockResolvedValue({})
})

afterEach(() => {
  vi.restoreAllMocks()
})

function submit() {
  fireEvent.click(screen.getByRole('button'))
}

describe('AdminActionForm', () => {
  it('envía los campos ocultos con la acción', async () => {
    render(
      <AdminActionForm
        action={action}
        hidden={{ contentId: 'c-1', versionId: 'v-1' }}
        label="Borrar versión"
        pendingLabel="Borrando…"
      />,
    )

    submit()

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))

    const formData = action.mock.calls[0][1]

    expect(formData.get('contentId')).toBe('c-1')
    expect(formData.get('versionId')).toBe('v-1')
  })

  it('con confirmText, un «Cancelar» no llega a ejecutar la acción', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <AdminActionForm
        action={action}
        hidden={{ id: 'x' }}
        label="Eliminar"
        pendingLabel="Eliminando…"
        confirmText="¿Seguro?"
      />,
    )

    submit()

    expect(confirm).toHaveBeenCalledWith('¿Seguro?')

    // Una pausa para dar a React la oportunidad de ejecutarla si no se
    // hubiera cancelado el envío.
    await act(async () => {
      await Promise.resolve()
    })

    expect(action).not.toHaveBeenCalled()
  })

  it('con confirmText, un «Aceptar» ejecuta la acción', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <AdminActionForm
        action={action}
        hidden={{ id: 'x' }}
        label="Eliminar"
        pendingLabel="Eliminando…"
        confirmText="¿Seguro?"
      />,
    )

    submit()

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
  })

  it('sin confirmText no pregunta nada', async () => {
    const confirm = vi.spyOn(window, 'confirm')

    render(
      <AdminActionForm
        action={action}
        label="Reenviar"
        pendingLabel="Enviando…"
      />,
    )

    submit()

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(confirm).not.toHaveBeenCalled()
  })

  it('mientras la acción está en marcha, muestra el texto de pendiente y bloquea el botón', async () => {
    let finish: (state: AdminActionState) => void = () => {}

    action.mockImplementation(
      () => new Promise<AdminActionState>((resolve) => (finish = resolve)),
    )

    render(
      <AdminActionForm
        action={action}
        label="Reprocesar CV"
        pendingLabel="Reprocesando…"
      />,
    )

    submit()

    const busy = await screen.findByRole('button', { name: 'Reprocesando…' })

    expect(busy).toBeDisabled()

    await act(async () => finish({ message: 'Hecho.' }))

    expect(
      await screen.findByRole('button', { name: 'Reprocesar CV' }),
    ).toBeEnabled()
  })

  it('pinta error, aviso y mensaje de éxito con su tipo', async () => {
    action.mockResolvedValueOnce({ error: 'Falló' })

    const { unmount } = render(
      <AdminActionForm action={action} label="Ir" pendingLabel="..." />,
    )

    submit()

    expect(await screen.findByText('Falló')).toBeInTheDocument()
    unmount()

    action.mockResolvedValueOnce({ warning: 'Quedaron 4 ficheros' })

    const second = render(
      <AdminActionForm action={action} label="Ir" pendingLabel="..." />,
    )

    submit()

    expect(await screen.findByText('Quedaron 4 ficheros')).toBeInTheDocument()
    second.unmount()

    action.mockResolvedValueOnce({ message: 'Todo bien' })

    render(<AdminActionForm action={action} label="Ir" pendingLabel="..." />)

    submit()

    expect(await screen.findByText('Todo bien')).toBeInTheDocument()
  })

  it('messagesFirst pone los mensajes por encima del botón', async () => {
    action.mockResolvedValueOnce({ error: 'Falló' })

    render(
      <AdminActionForm
        action={action}
        label="Eliminar contenido"
        pendingLabel="Eliminando…"
        messagesFirst
      />,
    )

    submit()

    const message = await screen.findByText('Falló')
    const button = screen.getByRole('button')

    expect(
      message.compareDocumentPosition(button) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('por defecto, los mensajes van debajo del botón', async () => {
    action.mockResolvedValueOnce({ error: 'Falló' })

    render(<AdminActionForm action={action} label="Ir" pendingLabel="..." />)

    submit()

    const message = await screen.findByText('Falló')
    const button = screen.getByRole('button')

    expect(
      button.compareDocumentPosition(message) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('disabled bloquea el botón aunque no haya nada en marcha', () => {
    render(
      <AdminActionForm
        action={action}
        label="Procesar"
        pendingLabel="Lanzando…"
        disabled
      />,
    )

    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('AdminActionFormView', () => {
  it('con showMessages={false} no pinta los mensajes (los pone quien lo usa)', () => {
    render(
      <AdminActionFormView
        action={() => {}}
        pending={false}
        state={{ error: 'No debería verse aquí' }}
        showMessages={false}
        label="Publicar ahora"
        pendingLabel="Publicando…"
      />,
    )

    expect(screen.queryByText('No debería verse aquí')).not.toBeInTheDocument()
  })

  it('pinta el contenido extra entre el botón y los mensajes', () => {
    render(
      <AdminActionFormView
        action={() => {}}
        pending={false}
        state={{ message: 'Calentados' }}
        label="Calentar vídeos"
        pendingLabel="Calentando…"
      >
        <small>3 vídeo(s) sin calentar.</small>
      </AdminActionFormView>,
    )

    const hint = screen.getByText('3 vídeo(s) sin calentar.')
    const message = screen.getByText('Calentados')

    expect(
      hint.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

describe('confirmSubmit', () => {
  it('cancela el evento si el usuario no confirma y lo deja pasar si confirma', () => {
    const preventDefault = vi.fn()
    const event = {
      preventDefault,
    } as unknown as React.FormEvent<HTMLFormElement>

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    confirmSubmit('¿Seguro?')(event)
    expect(preventDefault).toHaveBeenCalledTimes(1)

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    confirmSubmit('¿Seguro?')(event)
    expect(preventDefault).toHaveBeenCalledTimes(1)
  })
})
