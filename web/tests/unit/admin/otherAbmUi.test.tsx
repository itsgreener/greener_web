// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

vi.mock('@/app/admin/(panel)/contents/actions', () => ({
  createContentAction: vi.fn(),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/otherActions', () => ({
  saveOtherFrequencyAction: vi.fn(),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/publishActions', () => ({
  publishContentAction: vi.fn(),
  scheduleContentAction: vi.fn(),
  unpublishContentAction: vi.fn(),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/previewActions', () => ({
  generatePreviewLinkAction: vi.fn(),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/translationActions', () => ({
  saveTranslationAction: vi.fn(),
}))

import NewContentForm from '@/app/admin/(panel)/contents/new/NewContentForm'
import OtherDetailForm from '@/app/admin/(panel)/contents/[id]/edit/OtherDetailForm'
import PublishControls from '@/app/admin/(panel)/contents/[id]/edit/PublishControls'
import ContentTranslations from '@/app/admin/(panel)/contents/[id]/edit/ContentTranslations'

const CONTENT_ID = '3c9a5b8e-6f2a-4b1a-9b1a-2f6a5c9d1e3f'

function kindRadio(container: HTMLElement, value: 'newsletter' | 'page') {
  return container.querySelector(
    `input[name="kind"][value="${value}"]`,
  ) as HTMLInputElement
}

function typeRadio(container: HTMLElement, value: string) {
  return container.querySelector(
    `input[name="type"][value="${value}"]`,
  ) as HTMLInputElement
}

describe('alta de contenido — Other (plan de other, §7.1)', () => {
  it('un case no pide subtipo ni frecuencia', () => {
    const { container } = render(<NewContentForm />)

    expect(kindRadio(container, 'newsletter')).toBeNull()
    expect(screen.queryByLabelText(/Frecuencia/)).toBeNull()
  })

  it('al elegir Other aparecen los dos subtipos y la frecuencia con 100 por defecto y mínimo 25', () => {
    const { container } = render(<NewContentForm />)

    fireEvent.click(typeRadio(container, 'other'))

    const frequency = screen.getByLabelText(/Frecuencia/)

    expect(kindRadio(container, 'newsletter')).toBeRequired()
    expect(kindRadio(container, 'page')).toBeInTheDocument()
    expect(frequency).toHaveValue(100)
    expect(frequency).toHaveAttribute('min', '25')
    expect(frequency).toHaveAttribute('name', 'frequency')
  })

  it('elegir un subtipo lo marca como seleccionado', () => {
    const { container } = render(<NewContentForm />)

    fireEvent.click(typeRadio(container, 'other'))
    fireEvent.click(kindRadio(container, 'page'))

    expect(kindRadio(container, 'page')).toBeChecked()
    expect(kindRadio(container, 'newsletter')).not.toBeChecked()
  })

  it('al volver a otro tipo desaparece la sección', () => {
    const { container } = render(<NewContentForm />)

    fireEvent.click(typeRadio(container, 'other'))
    fireEvent.click(typeRadio(container, 'case'))

    expect(screen.queryByLabelText(/Frecuencia/)).toBeNull()
    expect(kindRadio(container, 'page')).toBeNull()
  })
})

describe('OtherDetailForm — frecuencia en el editor (§7.2)', () => {
  it('muestra el subtipo (solo lectura) y la frecuencia guardada', () => {
    render(
      <OtherDetailForm
        other={{ contentId: CONTENT_ID, kind: 'page', frequency: 75 }}
        otherFrequencies={[]}
      />,
    )

    expect(screen.getByText('Página satélite')).toBeInTheDocument()
    expect(screen.getByLabelText(/Frecuencia/)).toHaveValue(75)
    expect(screen.getByLabelText(/Frecuencia/)).toHaveAttribute('min', '25')
    expect(screen.getByDisplayValue(CONTENT_ID)).toHaveAttribute(
      'name',
      'contentId',
    )
    expect(
      screen.getByText(/se reparten desde el pin 10 y se espacian 8-15/),
    ).toBeInTheDocument()
  })
})

describe('OtherDetailForm — aviso de ocupación (plan de pendientes, A1)', () => {
  function renderForm(otherFrequencies: number[]) {
    render(
      <OtherDetailForm
        other={{ contentId: CONTENT_ID, kind: 'newsletter', frequency: 100 }}
        otherFrequencies={otherFrequencies}
      />,
    )
  }

  it('informa de la ocupación sin avisar mientras no pase del 10 %', () => {
    renderForm([100, 50])

    // 1 % + 2 % + 1 % (el valor tecleado, 100) = 4 %
    expect(screen.getByText(/4,0 %/)).toBeInTheDocument()
    expect(screen.queryByText(/Supera el 10 %/)).toBeNull()
  })

  it('avisa por encima del 10 % y se recalcula al teclear, sin bloquear', () => {
    renderForm([25, 25, 50])

    // 4 + 4 + 2 + 1 = 11 %
    expect(screen.getByText(/Supera el 10 %/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Frecuencia/), {
      target: { value: '500' },
    })

    // 4 + 4 + 2 + 0,2 = 10,2 %: sigue por encima del umbral
    expect(screen.getByText(/10,2 %/)).toBeInTheDocument()
    expect(screen.getByText(/Supera el 10 %/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Guardar/ })).not.toBeDisabled()
  })
})

function renderTranslations(otherKind: 'newsletter' | 'page') {
  render(
    <ContentTranslations
      contentId={CONTENT_ID}
      contentType="other"
      defaultLocale="es"
      translations={[]}
      otherKind={otherKind}
    />,
  )
}

describe('traducciones de un other (§7.3 y §7.4)', () => {
  it('se edita solo en el idioma principal, sin pestañas de idioma', () => {
    renderTranslations('newsletter')

    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.getAllByRole('textbox', { name: /Titular/ })).toHaveLength(1)
  })

  it('la newsletter tiene Titular y Texto de apoyo, sin SEO, Highlight ni Body', () => {
    renderTranslations('newsletter')

    expect(screen.getByLabelText('Titular')).toBeInTheDocument()
    expect(screen.getByLabelText('Texto de apoyo')).toBeInTheDocument()
    expect(screen.queryByLabelText('SEO title')).toBeNull()
    expect(screen.queryByLabelText('SEO description')).toBeNull()
    expect(screen.queryByLabelText('Highlight')).toBeNull()
    expect(screen.queryByLabelText('Body')).toBeNull()
  })

  it('la página satélite solo pide el título', () => {
    renderTranslations('page')

    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(screen.queryByLabelText('Summary')).toBeNull()
    expect(screen.queryByLabelText('Texto de apoyo')).toBeNull()
    expect(screen.queryByLabelText('SEO title')).toBeNull()
  })

  it('un tool conserva sus campos de SEO', () => {
    render(
      <ContentTranslations
        contentId={CONTENT_ID}
        contentType="tool"
        defaultLocale="es"
        translations={[]}
      />,
    )

    expect(screen.getAllByLabelText('SEO title').length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText('Summary').length).toBeGreaterThan(0)
  })
})

describe('PublishControls — vista previa (§6.7 del plan)', () => {
  it('un borrador normal tiene botón Preview', () => {
    render(
      <PublishControls
        contentId={CONTENT_ID}
        status="draft"
        publishAt={null}
      />,
    )

    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument()
  })

  it('un other no lo tiene: no hay vista previa de borrador', () => {
    render(
      <PublishControls
        contentId={CONTENT_ID}
        status="draft"
        publishAt={null}
        previewAvailable={false}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Preview' })).toBeNull()
    expect(screen.getByRole('button', { name: /Publicar/ })).toBeInTheDocument()
  })
})
