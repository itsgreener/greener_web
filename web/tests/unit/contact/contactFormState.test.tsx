// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import type { ContactActionState } from '@/app/(public)/contact/contactActions'

/**
 * Integración con el `useActionState` REAL de React 19 (sin simulacro): es lo
 * que decide si lo escrito sobrevive al reinicio del formulario que React
 * hace al terminar la acción. La Server Action se sustituye por una función
 * que responde con los mismos estados que la verdadera.
 */
const action =
  vi.fn<
    (prev: ContactActionState, data: FormData) => Promise<ContactActionState>
  >()

vi.mock('@/app/(public)/contact/contactActions', () => ({
  submitContactAction: (prev: ContactActionState, data: FormData) =>
    action(prev, data),
}))

import { ContactForm } from '@/app/(public)/contact/ContactForm'

const WRITTEN = {
  name: 'Marta García',
  phone: '+34 600 000 000',
  email: 'marta@example.com',
  message: 'Hola, quería preguntaros por vuestros servicios.',
}

/** Estado de fallo que devuelve la acción: lo escrito vuelve en `values`. */
const failure = (
  data: FormData,
  rest: Partial<ContactActionState>,
): ContactActionState => ({
  ...rest,
  values: {
    name: String(data.get('name')),
    phone: String(data.get('phone')),
    email: String(data.get('email')),
    message: String(data.get('message')),
  },
})

function fill(values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
}

async function submit(container: HTMLElement) {
  await act(async () => {
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)
  })
}

beforeEach(() => {
  action.mockReset()
})

describe('ContactForm con useActionState real', () => {
  it('tras un fallo de validación conserva lo escrito en todos los campos, también tras el reinicio de React 19', async () => {
    action.mockImplementation(async (_prev, data) =>
      failure(data, { fieldErrors: { email: ["Email isn't valid"] } }),
    )
    const { container } = render(<ContactForm />)

    fill({
      Name: WRITTEN.name,
      Phone: WRITTEN.phone,
      Email: 'no-es-un-email',
      Message: WRITTEN.message,
    })
    await submit(container)

    expect(action).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Name')).toHaveValue(WRITTEN.name)
    expect(screen.getByLabelText('Phone')).toHaveValue(WRITTEN.phone)
    expect(screen.getByLabelText('Email')).toHaveValue('no-es-un-email')
    expect(screen.getByLabelText('Message')).toHaveValue(WRITTEN.message)
  })

  it('el foco va al primer campo con error y el error se anuncia', async () => {
    action.mockImplementation(async (_prev, data) =>
      failure(data, {
        fieldErrors: {
          phone: ['Phone is required'],
          message: ['Message is required'],
        },
      }),
    )
    const { container } = render(<ContactForm />)

    await submit(container)

    expect(screen.getByLabelText('Phone')).toHaveFocus()
    expect(screen.getByLabelText('Phone')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })

  it('con un error general conserva lo escrito y lo anuncia con role="alert"', async () => {
    action.mockImplementation(async (_prev, data) =>
      failure(data, {
        formError:
          "We couldn't send your message right now. Please try again in a few minutes.",
      }),
    )
    const { container } = render(<ContactForm />)

    fill({ Name: WRITTEN.name, Message: WRITTEN.message })
    await submit(container)

    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't send your message right now",
    )
    expect(screen.getByLabelText('Name')).toHaveValue(WRITTEN.name)
    expect(screen.getByLabelText('Message')).toHaveValue(WRITTEN.message)
  })

  it('un segundo intento que sale bien sustituye el formulario por el aviso, con el foco en él', async () => {
    action
      .mockImplementationOnce(async (_prev, data) =>
        failure(data, { formError: 'Falló' }),
      )
      .mockImplementationOnce(async () => ({ success: true }))
    const { container } = render(<ContactForm />)

    fill({ Name: WRITTEN.name })
    await submit(container)
    expect(screen.getByLabelText('Name')).toHaveValue(WRITTEN.name)

    await submit(container)

    const status = screen.getByRole('status')
    expect(status).toHaveFocus()
    expect(screen.queryByLabelText('Name')).toBeNull()
  })

  it('en la primera carga no mueve el foco ni pinta alertas', () => {
    render(<ContactForm />)

    expect(document.body).toHaveFocus()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
