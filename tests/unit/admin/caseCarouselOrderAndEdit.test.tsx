// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Reordenar y editar las diapositivas ya subidas del carrusel de un caso
 * (9 nov 2026). Contrato que fijan estos tests:
 * - el orden se prepara en local y solo se guarda con «Guardar orden»
 *   (una sola llamada con la lista completa); «Descartar» no toca nada;
 * - con un orden sin guardar no se puede editar, quitar ni añadir;
 * - sin archivo nuevo, editar es cambiar el alt; con archivo, se sube y se
 *   sustituye en el mismo sitio, y si el registro falla se descarta lo subido.
 */

const refreshRouter = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => refreshRouter() }),
}))

const getSignedImageUpload = vi.fn()
const uploadImageToCloudinary = vi.fn()
const getSignedVideoUpload = vi.fn()
const uploadVideoToCloudinary = vi.fn()
const discardUploadQuietly = vi.fn()
const readLocalVideoDuration = vi.fn()
const validateImageSelection = vi.fn()
const reorderCaseCarouselAction = vi.fn()
const updateCaseCarouselAltAction = vi.fn()
const replaceCaseCarouselImageAction = vi.fn()
const replaceCaseCarouselVideoAction = vi.fn()
const removeCaseCarouselMediaAction = vi.fn()

vi.mock('@/modules/media/client/cloudinaryUpload', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/media/client/cloudinaryUpload')
  >('@/modules/media/client/cloudinaryUpload')

  return {
    ...actual,
    getSignedImageUpload: () => getSignedImageUpload(),
    uploadImageToCloudinary: (...args: unknown[]) =>
      uploadImageToCloudinary(...args),
    getSignedVideoUpload: () => getSignedVideoUpload(),
    uploadVideoToCloudinary: (...args: unknown[]) =>
      uploadVideoToCloudinary(...args),
  }
})

vi.mock('@/modules/media/client/validateImageSelection', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/media/client/validateImageSelection')
  >('@/modules/media/client/validateImageSelection')

  return {
    ...actual,
    validateImageSelection: (...args: unknown[]) =>
      validateImageSelection(...args),
  }
})

vi.mock('@/modules/media/client/readLocalVideoDuration', () => ({
  readLocalVideoDuration: (...args: unknown[]) =>
    readLocalVideoDuration(...args),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/caseCarouselActions', () => ({
  addCaseCarouselImageAction: vi.fn(),
  addCaseCarouselVideoAction: vi.fn(),
  removeAllCaseCarouselMediaAction: vi.fn(),
  removeCaseCarouselMediaAction: (...args: unknown[]) =>
    removeCaseCarouselMediaAction(...args),
  reorderCaseCarouselAction: (...args: unknown[]) =>
    reorderCaseCarouselAction(...args),
  updateCaseCarouselAltAction: (...args: unknown[]) =>
    updateCaseCarouselAltAction(...args),
  replaceCaseCarouselImageAction: (...args: unknown[]) =>
    replaceCaseCarouselImageAction(...args),
  replaceCaseCarouselVideoAction: (...args: unknown[]) =>
    replaceCaseCarouselVideoAction(...args),
}))

vi.mock('@/app/admin/(panel)/contents/[id]/edit/discardUpload', () => ({
  discardUploadQuietly: (...args: unknown[]) => discardUploadQuietly(...args),
}))

import CaseCarouselManager from '@/app/admin/(panel)/contents/[id]/edit/CaseCarouselManager'
import type { CarouselItem } from '@/app/admin/(panel)/contents/[id]/edit/CaseCarouselManager/types'
import { resetEditorLockForTests } from '@/app/admin/(panel)/contents/[id]/edit/editorLock'

const SIGNED = {
  timestamp: 1,
  signature: 's',
  folder: 'f',
  apiKey: 'k',
  cloudName: 'demo',
}

const items: CarouselItem[] = [0, 1, 2].map((n) => ({
  mediaId: `m-${n}`,
  kind: 'image' as const,
  cloudinaryPublicId: `greener/content/${n}`,
  sortOrder: n,
  alt: `alt ${n}`,
}))

function renderManager(list: CarouselItem[] = items) {
  return render(<CaseCarouselManager contentId="content-1" items={list} />)
}

/** Alt de las diapositivas, en el orden en que se ven. */
function visibleOrder() {
  return screen.getAllByText(/^alt \d$/).map((node) => node.textContent)
}

const move = (position: number, direction: 'antes' | 'después') =>
  fireEvent.click(
    screen.getByRole('button', {
      name: `Mover la diapositiva ${position} ${direction}`,
    }),
  )

function openEditor(position: number) {
  fireEvent.click(
    screen.getByRole('button', { name: `Editar la diapositiva ${position}` }),
  )
}

const altField = () =>
  document.getElementById('carousel-edit-alt') as HTMLInputElement
const fileField = () =>
  document.getElementById('carousel-edit-file') as HTMLInputElement

function chooseFile(file: File) {
  fireEvent.change(fileField(), { target: { files: [file] } })
}

const saveChanges = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

const newImage = () =>
  new File(['x'.repeat(256)], 'nueva.jpg', { type: 'image/jpeg' })
const newVideo = () =>
  new File(['x'.repeat(256)], 'nuevo.mp4', { type: 'video/mp4' })

beforeEach(() => {
  resetEditorLockForTests()
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  getSignedImageUpload.mockResolvedValue(SIGNED)
  getSignedVideoUpload.mockResolvedValue(SIGNED)
  validateImageSelection.mockResolvedValue(null)
  readLocalVideoDuration.mockResolvedValue(12)
  reorderCaseCarouselAction.mockResolvedValue({ ok: true })
  updateCaseCarouselAltAction.mockResolvedValue({ ok: true })
  replaceCaseCarouselImageAction.mockResolvedValue({ ok: true })
  replaceCaseCarouselVideoAction.mockResolvedValue({ ok: true })
  uploadImageToCloudinary.mockResolvedValue({
    public_id: 'greener/content/nueva',
    format: 'jpg',
    width: 1600,
    height: 900,
    bytes: 200_000,
  })
  uploadVideoToCloudinary.mockResolvedValue({
    public_id: 'greener/content/videos/nuevo',
    format: 'mp4',
    width: 1920,
    height: 1080,
    duration: 12,
    bytes: 4 * 1024 * 1024,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CaseCarouselManager — reordenar', () => {
  it('numera las diapositivas y no deja mover la primera hacia atrás ni la última hacia delante', () => {
    renderManager()

    expect(screen.getByText('Diapositiva 1 de 3')).toBeInTheDocument()
    expect(screen.getByText('Diapositiva 3 de 3')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Mover la diapositiva 1 antes' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Mover la diapositiva 3 después' }),
    ).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Guardar orden' })).toBeNull()
  })

  it('una flecha cambia el orden en pantalla, sin guardar nada todavía', () => {
    renderManager()

    move(1, 'después')

    expect(visibleOrder()).toEqual(['alt 1', 'alt 0', 'alt 2'])
    expect(
      screen.getByRole('button', { name: 'Guardar orden' }),
    ).toBeInTheDocument()
    expect(reorderCaseCarouselAction).not.toHaveBeenCalled()
  })

  it('el campo «Posición» manda la diapositiva a ese sitio (y acota al rango)', () => {
    renderManager()

    const field = screen.getByLabelText('Posición de la diapositiva 1')

    fireEvent.change(field, { target: { value: '3' } })
    fireEvent.blur(field)

    expect(visibleOrder()).toEqual(['alt 1', 'alt 2', 'alt 0'])

    const first = screen.getByLabelText('Posición de la diapositiva 1')

    fireEvent.change(first, { target: { value: '99' } })
    fireEvent.blur(first)

    expect(visibleOrder()).toEqual(['alt 2', 'alt 0', 'alt 1'])
  })

  it('un valor que no es un número no mueve nada', () => {
    renderManager()

    const field = screen.getByLabelText('Posición de la diapositiva 2')

    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)

    expect(visibleOrder()).toEqual(['alt 0', 'alt 1', 'alt 2'])
    expect(screen.queryByRole('button', { name: 'Guardar orden' })).toBeNull()
  })

  it('«Guardar orden» envía la lista completa de ids en el orden nuevo y refresca', async () => {
    renderManager()
    move(1, 'después')
    move(2, 'después')

    fireEvent.click(screen.getByRole('button', { name: 'Guardar orden' }))

    await waitFor(() => {
      expect(reorderCaseCarouselAction).toHaveBeenCalledWith({
        contentId: 'content-1',
        mediaIds: ['m-1', 'm-2', 'm-0'],
      })
    })
    await waitFor(() => expect(refreshRouter).toHaveBeenCalled())
  })

  it('«Descartar» vuelve al orden guardado sin llamar al servidor', () => {
    renderManager()
    move(1, 'después')

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(visibleOrder()).toEqual(['alt 0', 'alt 1', 'alt 2'])
    expect(screen.queryByRole('button', { name: 'Guardar orden' })).toBeNull()
    expect(reorderCaseCarouselAction).not.toHaveBeenCalled()
  })

  it('si volver a poner todo como estaba, el aviso de orden sin guardar desaparece', () => {
    renderManager()
    move(1, 'después')
    move(2, 'antes')

    expect(visibleOrder()).toEqual(['alt 0', 'alt 1', 'alt 2'])
    expect(screen.queryByRole('button', { name: 'Guardar orden' })).toBeNull()
  })

  it('si el servidor lo rechaza, enseña el error y conserva el borrador', async () => {
    reorderCaseCarouselAction.mockResolvedValue({
      ok: false,
      error: 'El carrusel ha cambiado desde otra pestaña.',
    })
    renderManager()
    move(1, 'después')

    fireEvent.click(screen.getByRole('button', { name: 'Guardar orden' }))

    expect(
      await screen.findByText('El carrusel ha cambiado desde otra pestaña.'),
    ).toBeInTheDocument()
    expect(visibleOrder()).toEqual(['alt 1', 'alt 0', 'alt 2'])
    expect(refreshRouter).not.toHaveBeenCalled()
  })

  it('con un orden sin guardar no se puede editar, quitar ni añadir', () => {
    renderManager()
    move(1, 'después')

    for (const button of screen.getAllByRole('button', { name: 'Quitar' })) {
      expect(button).toBeDisabled()
    }
    expect(
      screen.getByRole('button', { name: 'Editar la diapositiva 1' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /Quitar todas las diapositivas/ }),
    ).toBeDisabled()
    expect(document.getElementById('carousel-files')).toBeDisabled()
    expect(screen.getByText(/Guarda o descarta el nuevo orden/)).toBeVisible()
  })

  it('una diapositiva que aparece mientras se ordena (otra pestaña) va al final y no rompe el borrador', () => {
    const { rerender } = renderManager()

    move(1, 'después')

    rerender(
      <CaseCarouselManager
        contentId="content-1"
        items={[
          ...items,
          {
            mediaId: 'm-3',
            kind: 'image',
            cloudinaryPublicId: 'greener/content/3',
            sortOrder: 3,
            alt: 'alt 3',
          },
        ]}
      />,
    )

    expect(visibleOrder()).toEqual(['alt 1', 'alt 0', 'alt 2', 'alt 3'])
  })
})

describe('CaseCarouselManager — editar una diapositiva', () => {
  it('«Editar» abre el panel con el alt actual y resalta la diapositiva', () => {
    renderManager()

    openEditor(2)

    expect(screen.getByText('Editar diapositiva 2')).toBeInTheDocument()
    expect(altField()).toHaveValue('alt 1')
  })

  it('«Cancelar» cierra el panel sin llamar al servidor', () => {
    renderManager()
    openEditor(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('Editar diapositiva 1')).toBeNull()
    expect(updateCaseCarouselAltAction).not.toHaveBeenCalled()
  })

  it('sin archivo nuevo cambia solo el alt: no sube nada a Cloudinary', async () => {
    renderManager()
    openEditor(2)

    fireEvent.change(altField(), { target: { value: '  New alt text  ' } })
    saveChanges()

    await waitFor(() => {
      expect(updateCaseCarouselAltAction).toHaveBeenCalledWith({
        contentId: 'content-1',
        mediaId: 'm-1',
        alt: 'New alt text',
      })
    })
    expect(uploadImageToCloudinary).not.toHaveBeenCalled()
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled()
    await waitFor(() => expect(refreshRouter).toHaveBeenCalled())
    await waitFor(() =>
      expect(screen.queryByText('Editar diapositiva 2')).toBeNull(),
    )
  })

  it('sin cambios no llama al servidor y lo explica', () => {
    renderManager()
    openEditor(1)

    saveChanges()

    expect(screen.getByText(/No hay nada que guardar/)).toBeInTheDocument()
    expect(updateCaseCarouselAltAction).not.toHaveBeenCalled()
  })

  it('un alt en blanco no se guarda', () => {
    renderManager()
    openEditor(1)

    fireEvent.change(altField(), { target: { value: '   ' } })
    saveChanges()

    expect(screen.getByText('El alt es obligatorio.')).toBeInTheDocument()
    expect(updateCaseCarouselAltAction).not.toHaveBeenCalled()
  })

  it('si el servidor rechaza el alt, enseña el error y deja el panel abierto', async () => {
    updateCaseCarouselAltAction.mockResolvedValue({
      ok: false,
      error: 'Esta diapositiva ya no está en el carrusel.',
    })
    renderManager()
    openEditor(1)

    fireEvent.change(altField(), { target: { value: 'Otro' } })
    saveChanges()

    expect(
      await screen.findByText('Esta diapositiva ya no está en el carrusel.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Editar diapositiva 1')).toBeInTheDocument()
  })

  it('sustituir por una imagen: sube, registra con el mediaId y el alt del panel, y refresca', async () => {
    renderManager()
    openEditor(3)

    chooseFile(newImage())
    fireEvent.change(altField(), { target: { value: 'Replaced photo' } })
    saveChanges()

    await waitFor(() => {
      expect(replaceCaseCarouselImageAction).toHaveBeenCalledWith({
        contentId: 'content-1',
        mediaId: 'm-2',
        cloudinaryPublicId: 'greener/content/nueva',
        format: 'jpg',
        width: 1600,
        height: 900,
        bytes: 200_000,
        alt: 'Replaced photo',
      })
    })
    expect(updateCaseCarouselAltAction).not.toHaveBeenCalled()
    await waitFor(() => expect(refreshRouter).toHaveBeenCalled())
    expect(discardUploadQuietly).not.toHaveBeenCalled()
  })

  it('sustituir por un vídeo (cambio de tipo): valida la duración y registra el vídeo', async () => {
    renderManager()
    openEditor(1)

    chooseFile(newVideo())
    saveChanges()

    await waitFor(() => {
      expect(replaceCaseCarouselVideoAction).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: 'content-1',
          mediaId: 'm-0',
          cloudinaryPublicId: 'greener/content/videos/nuevo',
          durationSeconds: 12,
          alt: 'alt 0',
        }),
      )
    })
    expect(replaceCaseCarouselImageAction).not.toHaveBeenCalled()
  })

  it('un vídeo de más de 300 s según Cloudinary se rechaza, se descarta y no se registra', async () => {
    uploadVideoToCloudinary.mockResolvedValue({
      public_id: 'greener/content/videos/largo',
      format: 'mp4',
      width: 1920,
      height: 1080,
      duration: 360,
      bytes: 4 * 1024 * 1024,
    })
    renderManager()
    openEditor(1)

    chooseFile(newVideo())
    saveChanges()

    expect(await screen.findByText(/300 segundos/)).toBeInTheDocument()
    expect(replaceCaseCarouselVideoAction).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/content/videos/largo',
      kind: 'video',
    })
  })

  it('si el servidor rechaza el registro, descarta el archivo nuevo y enseña el error', async () => {
    replaceCaseCarouselImageAction.mockResolvedValue({
      ok: false,
      error: 'No se ha podido sustituir la imagen.',
    })
    renderManager()
    openEditor(1)

    chooseFile(newImage())
    saveChanges()

    expect(
      await screen.findByText('No se ha podido sustituir la imagen.'),
    ).toBeInTheDocument()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/content/nueva',
      kind: 'image',
    })
    expect(refreshRouter).not.toHaveBeenCalled()
    expect(screen.getByText('Editar diapositiva 1')).toBeInTheDocument()
  })

  it('si el archivo anterior no se pudo borrar, la sustitución vale y se muestra el aviso', async () => {
    replaceCaseCarouselImageAction.mockResolvedValue({
      ok: true,
      warning: 'No se ha podido borrar el archivo anterior de Cloudinary.',
    })
    renderManager()
    openEditor(1)

    chooseFile(newImage())
    saveChanges()

    expect(
      await screen.findByText(
        'No se ha podido borrar el archivo anterior de Cloudinary.',
      ),
    ).toBeInTheDocument()
    expect(discardUploadQuietly).not.toHaveBeenCalled()
    await waitFor(() => expect(refreshRouter).toHaveBeenCalled())
  })

  it('un archivo que no es imagen ni vídeo admitido no se sube', () => {
    renderManager()
    openEditor(1)

    chooseFile(new File(['x'], 'anim.gif', { type: 'image/gif' }))
    saveChanges()

    expect(screen.getByText(/Formato no admitido/)).toBeInTheDocument()
    expect(getSignedImageUpload).not.toHaveBeenCalled()
    expect(getSignedVideoUpload).not.toHaveBeenCalled()
  })

  it('una imagen que no pasa la validación del navegador no llega a Cloudinary', async () => {
    validateImageSelection.mockResolvedValue('La imagen supera los 5 MB.')
    renderManager()
    openEditor(1)

    chooseFile(newImage())
    saveChanges()

    expect(
      await screen.findByText('La imagen supera los 5 MB.'),
    ).toBeInTheDocument()
    expect(uploadImageToCloudinary).not.toHaveBeenCalled()
    expect(replaceCaseCarouselImageAction).not.toHaveBeenCalled()
  })

  it('con la edición en marcha el resto de operaciones del editor quedan bloqueadas', async () => {
    let finish: (value: { ok: true }) => void = () => {}

    updateCaseCarouselAltAction.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    renderManager()
    openEditor(1)
    fireEvent.change(altField(), { target: { value: 'Otro' } })
    saveChanges()

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Guardar cambios' }),
      ).toBeDisabled(),
    )
    expect(
      screen.getByRole('button', { name: 'Editar la diapositiva 2' }),
    ).toBeDisabled()

    finish({ ok: true })
    await waitFor(() => expect(refreshRouter).toHaveBeenCalled())
  })
})
