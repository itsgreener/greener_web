// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Carga masiva del carrusel de un caso (9 nov 2026): antes se subía una
 * diapositiva cada vez, eligiendo imagen o vídeo en cada una. Ahora se elige
 * el tipo, se seleccionan varios archivos de ese tipo y, opcionalmente, un CSV
 * con los alt. Estos tests fijan el contrato: el lote es de un solo tipo, el
 * alt es obligatorio, las diapositivas se añaden por orden de nombre con un
 * `sortOrder` correlativo a partir de lo que ya hay, y una fila que falla no
 * frena a las demás ni deja basura en Cloudinary.
 */

const refreshRouter = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => refreshRouter() }),
}))

const getSignedImageUpload = vi.fn()
const uploadImageToCloudinary = vi.fn()
const getSignedVideoUpload = vi.fn()
const uploadVideoToCloudinary = vi.fn()
const addCaseCarouselImageAction = vi.fn()
const addCaseCarouselVideoAction = vi.fn()
const discardUploadQuietly = vi.fn()
const readLocalVideoDuration = vi.fn()
const validateImageSelection = vi.fn()

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
  addCaseCarouselImageAction: (...args: unknown[]) =>
    addCaseCarouselImageAction(...args),
  addCaseCarouselVideoAction: (...args: unknown[]) =>
    addCaseCarouselVideoAction(...args),
  removeCaseCarouselMediaAction: vi.fn(),
  removeAllCaseCarouselMediaAction: vi.fn(),
  reorderCaseCarouselAction: vi.fn(),
  updateCaseCarouselAltAction: vi.fn(),
  replaceCaseCarouselImageAction: vi.fn(),
  replaceCaseCarouselVideoAction: vi.fn(),
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

const image = (name: string, type = 'image/jpeg') =>
  new File(['x'.repeat(256)], name, { type })
const video = (name: string, type = 'video/mp4') =>
  new File(['x'.repeat(256)], name, { type })
const csvFile = (text: string, name = 'alts.csv') =>
  new File([text], name, { type: 'text/csv' })

function uploadedImage(publicId: string) {
  return {
    public_id: publicId,
    format: 'jpg',
    width: 1600,
    height: 900,
    bytes: 200_000,
  }
}

function uploadedVideo(publicId: string, overrides = {}) {
  return {
    public_id: publicId,
    format: 'mp4',
    width: 1920,
    height: 1080,
    duration: 12,
    bytes: 4 * 1024 * 1024,
    ...overrides,
  }
}

function existingItem(id: string, sortOrder: number): CarouselItem {
  return {
    id,
    sortOrder,
    kind: 'image',
    publicId: `greener/${id}`,
    alt: `Alt ${id}`,
    width: 1600,
    height: 900,
  } as unknown as CarouselItem
}

function renderManager(items: CarouselItem[] = []) {
  return render(<CaseCarouselManager contentId="content-1" items={items} />)
}

const filesInput = () =>
  document.getElementById('carousel-files') as HTMLInputElement
const csvInput = () =>
  document.getElementById('carousel-csv') as HTMLInputElement

function chooseKind(kind: 'image' | 'video') {
  fireEvent.change(screen.getByLabelText('Tipo de archivo'), {
    target: { value: kind },
  })
}

function chooseFiles(files: File[]) {
  fireEvent.change(filesInput(), { target: { files } })
}

function altInput(name: string) {
  return screen.getByLabelText(`Alt de ${name}`) as HTMLInputElement
}

function typeAlt(name: string, value: string) {
  fireEvent.change(altInput(name), { target: { value } })
}

function clickUpload(label: RegExp | string) {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

function fileNamesInTable() {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => row.querySelectorAll('td')[1]?.textContent)
}

beforeEach(() => {
  resetEditorLockForTests()
  vi.clearAllMocks()
  getSignedImageUpload.mockResolvedValue(SIGNED)
  getSignedVideoUpload.mockResolvedValue(SIGNED)
  validateImageSelection.mockResolvedValue(null)
  readLocalVideoDuration.mockResolvedValue(10)
  addCaseCarouselImageAction.mockResolvedValue({ ok: true })
  addCaseCarouselVideoAction.mockResolvedValue({ ok: true })
  discardUploadQuietly.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CaseCarouselManager — carga masiva: selección', () => {
  it('por defecto es un lote de imágenes y el input admite varios archivos', () => {
    renderManager()

    expect(screen.getByLabelText('Tipo de archivo')).toHaveValue('image')
    expect(filesInput()).toHaveAttribute('multiple')
    expect(filesInput().accept).toContain('image/jpeg')
    expect(screen.getByText(/Imágenes \(varias\)/)).toBeInTheDocument()
  })

  it('con el tipo vídeo, el input acepta vídeo (con respaldo por extensión)', () => {
    renderManager()
    chooseKind('video')

    expect(filesInput().accept).toContain('video/*')
    expect(filesInput().accept).toContain('.mov')
    expect(screen.getByText(/Vídeos \(varios\)/)).toBeInTheDocument()
  })

  it('lista los archivos por orden de nombre natural: slide-2 antes que slide-10', () => {
    renderManager()
    chooseFiles([
      image('slide-10.jpg'),
      image('slide-2.jpg'),
      image('slide-1.jpg'),
    ])

    expect(fileNamesInTable()).toEqual([
      'slide-1.jpg',
      'slide-2.jpg',
      'slide-10.jpg',
    ])
  })

  it('en un lote de imágenes descarta los vídeos y lo avisa', () => {
    renderManager()
    chooseFiles([
      image('a.jpg'),
      video('b.mp4'),
      video('c.mov', 'video/quicktime'),
    ])

    expect(fileNamesInTable()).toEqual(['a.jpg'])
    expect(
      screen.getByText(
        /Descartados 2 archivos que no encajan en un lote de imágenes: b\.mp4, c\.mov/,
      ),
    ).toBeInTheDocument()
  })

  it('en un lote de vídeos descarta las imágenes y lo avisa', () => {
    renderManager()
    chooseKind('video')
    chooseFiles([video('a.mp4'), image('b.jpg')])

    expect(fileNamesInTable()).toEqual(['a.mp4'])
    expect(
      screen.getByText(
        /Descartado 1 archivo que no encaja en un lote de vídeos: b\.jpg/,
      ),
    ).toBeInTheDocument()
  })

  it('un GIF no entra en un lote de imágenes', () => {
    renderManager()
    chooseFiles([image('a.jpg'), image('anim.gif', 'image/gif')])

    expect(fileNamesInTable()).toEqual(['a.jpg'])
    expect(screen.getByText(/anim\.gif/)).toBeInTheDocument()
  })

  it('cambiar de tipo vacía el lote y los avisos', () => {
    renderManager()
    chooseFiles([image('a.jpg'), video('b.mp4')])

    expect(screen.getByRole('table')).toBeInTheDocument()
    chooseKind('video')

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(/Descartados/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Subir/ }),
    ).not.toBeInTheDocument()
  })

  it('quitar una fila solo quita esa', () => {
    renderManager()
    chooseFiles([image('a.jpg'), image('b.jpg'), image('c.jpg')])

    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar b.jpg del lote' }),
    )

    expect(fileNamesInTable()).toEqual(['a.jpg', 'c.jpg'])
    expect(
      screen.getByRole('button', { name: 'Subir 2 imágenes' }),
    ).toBeInTheDocument()
  })
})

describe('CaseCarouselManager — carga masiva: CSV de alt', () => {
  it('rellena el alt de cada archivo con su fila, sin distinguir mayúsculas', async () => {
    renderManager()
    chooseFiles([image('Slide-1.JPG'), image('slide-2.jpg')])
    fireEvent.change(csvInput(), {
      target: {
        files: [
          csvFile(
            'filename,alt\nslide-1.jpg,First slide\nslide-2.jpg,Second slide',
          ),
        ],
      },
    })

    await waitFor(() =>
      expect(altInput('Slide-1.JPG')).toHaveValue('First slide'),
    )
    expect(altInput('slide-2.jpg')).toHaveValue('Second slide')
  })

  it('el CSV cargado antes que los archivos también se aplica', async () => {
    renderManager()
    fireEvent.change(csvInput(), {
      target: { files: [csvFile('filename;alt\na.jpg;Con punto y coma')] },
    })
    // Deja que se lea el CSV antes de elegir archivos.
    await waitFor(() => expect(csvInput().files).toHaveLength(1))
    await new Promise((resolve) => setTimeout(resolve, 20))
    chooseFiles([image('a.jpg')])

    expect(altInput('a.jpg')).toHaveValue('Con punto y coma')
  })

  it('un alt escrito a mano sobrevive a cargar el CSV', async () => {
    renderManager()
    chooseFiles([image('a.jpg'), image('b.jpg')])
    typeAlt('a.jpg', 'Escrito a mano')
    fireEvent.change(csvInput(), {
      target: {
        files: [csvFile('filename,alt\na.jpg,Del CSV\nb.jpg,B del CSV')],
      },
    })

    await waitFor(() => expect(altInput('b.jpg')).toHaveValue('B del CSV'))
    expect(altInput('a.jpg')).toHaveValue('Escrito a mano')
  })

  it('avisa de las filas del CSV sin archivo y de los archivos sin fila', async () => {
    renderManager()
    chooseFiles([image('a.jpg'), image('b.jpg')])
    fireEvent.change(csvInput(), {
      target: { files: [csvFile('filename,alt\na.jpg,A\ntypo.jpg,T')] },
    })

    expect(
      await screen.findByText(
        /El CSV tiene 1 fila sin archivo en la selección: typo\.jpg\./,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/1 archivo no aparece en el CSV: b\.jpg\./),
    ).toBeInTheDocument()
  })

  it('un CSV sin filas válidas lo dice', async () => {
    renderManager()
    chooseFiles([image('a.jpg')])
    fireEvent.change(csvInput(), {
      target: { files: [csvFile('archivo,texto\na.jpg,A')] },
    })

    expect(
      await screen.findByText(/no contiene ninguna fila válida/),
    ).toBeInTheDocument()
  })

  it('un CSV sin columna alt lo dice y deja los alt vacíos', async () => {
    renderManager()
    chooseFiles([image('a.jpg')])
    fireEvent.change(csvInput(), {
      target: { files: [csvFile('filename\na.jpg')] },
    })

    expect(
      await screen.findByText('El CSV no trae la columna alt.'),
    ).toBeInTheDocument()
    expect(altInput('a.jpg')).toHaveValue('')
  })

  it('cambiar de tipo conserva el CSV y se aplica a los archivos del otro tipo', async () => {
    renderManager()
    fireEvent.change(csvInput(), {
      target: { files: [csvFile('filename,alt\nclip.mp4,A clip')] },
    })
    await new Promise((resolve) => setTimeout(resolve, 20))
    chooseKind('video')
    chooseFiles([video('clip.mp4')])

    expect(altInput('clip.mp4')).toHaveValue('A clip')
  })
})

describe('CaseCarouselManager — carga masiva: subida', () => {
  it('sin archivos no hay botón de subir', () => {
    renderManager()

    expect(
      screen.queryByRole('button', { name: /^Subir/ }),
    ).not.toBeInTheDocument()
  })

  it('el alt es obligatorio: con alguno vacío no se sube nada', async () => {
    renderManager()
    chooseFiles([image('a.jpg'), image('b.jpg')])
    typeAlt('a.jpg', 'Solo este')
    clickUpload('Subir 2 imágenes')

    expect(
      await screen.findByText(
        /Falta el alt de 1 archivo \(b\.jpg\): no se sube nada hasta completarlo/,
      ),
    ).toBeInTheDocument()
    expect(uploadImageToCloudinary).not.toHaveBeenCalled()
    expect(addCaseCarouselImageAction).not.toHaveBeenCalled()
  })

  it('un alt hecho solo de espacios cuenta como vacío', async () => {
    renderManager()
    chooseFiles([image('a.jpg')])
    typeAlt('a.jpg', '   ')
    clickUpload('Subir 1 imagen')

    expect(
      await screen.findByText(/Falta el alt de 1 archivo/),
    ).toBeInTheDocument()
    expect(uploadImageToCloudinary).not.toHaveBeenCalled()
  })

  it('sube un lote de imágenes en orden, con sortOrder correlativo, el alt recortado y un solo refresh', async () => {
    uploadImageToCloudinary
      .mockResolvedValueOnce(uploadedImage('img/1'))
      .mockResolvedValueOnce(uploadedImage('img/2'))
      .mockResolvedValueOnce(uploadedImage('img/3'))

    renderManager()
    chooseFiles([
      image('slide-10.jpg'),
      image('slide-2.jpg'),
      image('slide-1.jpg'),
    ])
    typeAlt('slide-1.jpg', '  Uno ')
    typeAlt('slide-2.jpg', 'Dos')
    typeAlt('slide-10.jpg', 'Diez')
    clickUpload('Subir 3 imágenes')

    expect(
      await screen.findByText('3 subidas correctamente.'),
    ).toBeInTheDocument()
    expect(addCaseCarouselImageAction.mock.calls.map(([arg]) => arg)).toEqual([
      expect.objectContaining({
        contentId: 'content-1',
        cloudinaryPublicId: 'img/1',
        sortOrder: 0,
        alt: 'Uno',
      }),
      expect.objectContaining({
        cloudinaryPublicId: 'img/2',
        sortOrder: 1,
        alt: 'Dos',
      }),
      expect.objectContaining({
        cloudinaryPublicId: 'img/3',
        sortOrder: 2,
        alt: 'Diez',
      }),
    ])
    expect(refreshRouter).toHaveBeenCalledTimes(1)
  })

  it('REGRESIÓN: el primer sortOrder es el máximo existente + 1, no cuántas hay (huecos tras quitar)', async () => {
    uploadImageToCloudinary.mockResolvedValue(uploadedImage('img/n'))

    // Órdenes 1 y 2: la diapositiva 0 se quitó. «Cuántas hay» daría 2 y empataría.
    renderManager([existingItem('x', 1), existingItem('y', 2)])
    chooseFiles([image('a.jpg'), image('b.jpg')])
    typeAlt('a.jpg', 'A')
    typeAlt('b.jpg', 'B')
    clickUpload('Subir 2 imágenes')

    await screen.findByText('2 subidas correctamente.')
    expect(
      addCaseCarouselImageAction.mock.calls.map(([arg]) => arg.sortOrder),
    ).toEqual([3, 4])
  })

  it('con el alt leído de un CSV se sube sin escribir nada', async () => {
    uploadImageToCloudinary.mockResolvedValue(uploadedImage('img/1'))

    renderManager()
    chooseFiles([image('a.jpg')])
    fireEvent.change(csvInput(), {
      target: { files: [csvFile('filename,alt\na.jpg,Alt del CSV')] },
    })
    await waitFor(() => expect(altInput('a.jpg')).toHaveValue('Alt del CSV'))
    clickUpload('Subir 1 imagen')

    await screen.findByText('1 subida correctamente.')
    expect(addCaseCarouselImageAction).toHaveBeenCalledWith(
      expect.objectContaining({ alt: 'Alt del CSV' }),
    )
  })

  it('sube un lote de vídeos y registra la duración que mide Cloudinary', async () => {
    uploadVideoToCloudinary
      .mockResolvedValueOnce(uploadedVideo('vid/1', { duration: 30 }))
      .mockResolvedValueOnce(uploadedVideo('vid/2', { duration: 45 }))

    renderManager()
    chooseKind('video')
    chooseFiles([video('b.mp4'), video('a.mp4')])
    typeAlt('a.mp4', 'Primero')
    typeAlt('b.mp4', 'Segundo')
    clickUpload('Subir 2 vídeos')

    expect(
      await screen.findByText('2 subidas correctamente.'),
    ).toBeInTheDocument()
    expect(addCaseCarouselVideoAction.mock.calls.map(([arg]) => arg)).toEqual([
      expect.objectContaining({
        cloudinaryPublicId: 'vid/1',
        durationSeconds: 30,
        sortOrder: 0,
        alt: 'Primero',
      }),
      expect.objectContaining({
        cloudinaryPublicId: 'vid/2',
        durationSeconds: 45,
        sortOrder: 1,
        alt: 'Segundo',
      }),
    ])
    expect(addCaseCarouselImageAction).not.toHaveBeenCalled()
    expect(refreshRouter).toHaveBeenCalledTimes(1)
  })

  it('un vídeo de más de 180 s se rechaza tras subir, se descarta de Cloudinary y no se guarda', async () => {
    uploadVideoToCloudinary.mockResolvedValue(
      uploadedVideo('vid/largo', { duration: 400 }),
    )

    renderManager()
    chooseKind('video')
    chooseFiles([video('largo.mp4')])
    typeAlt('largo.mp4', 'Largo')
    clickUpload('Subir 1 vídeo')

    expect(await screen.findByText(/Error:/)).toBeInTheDocument()
    expect(addCaseCarouselVideoAction).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'vid/largo',
      kind: 'video',
    })
    expect(refreshRouter).not.toHaveBeenCalled()
  })

  it('una fila que falla no frena a las demás; las buenas se guardan y el contador no deja hueco', async () => {
    uploadImageToCloudinary
      .mockResolvedValueOnce(uploadedImage('img/a'))
      .mockRejectedValueOnce(new Error('Cloudinary no responde'))
      .mockResolvedValueOnce(uploadedImage('img/c'))

    renderManager()
    chooseFiles([image('a.jpg'), image('b.jpg'), image('c.jpg')])
    for (const name of ['a.jpg', 'b.jpg', 'c.jpg']) typeAlt(name, `Alt ${name}`)
    clickUpload('Subir 3 imágenes')

    expect(
      await screen.findByText('2 subidas correctamente, 1 con error.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Error: Cloudinary no responde/),
    ).toBeInTheDocument()
    expect(
      addCaseCarouselImageAction.mock.calls.map(([arg]) => [
        arg.cloudinaryPublicId,
        arg.sortOrder,
      ]),
    ).toEqual([
      ['img/a', 0],
      ['img/c', 1],
    ])
    expect(refreshRouter).toHaveBeenCalledTimes(1)
  })

  it('si el servidor rechaza el registro, la fila queda en error y lo subido se descarta', async () => {
    uploadImageToCloudinary.mockResolvedValue(uploadedImage('img/huerfana'))
    addCaseCarouselImageAction.mockResolvedValue({
      ok: false,
      error: 'No se ha podido guardar la diapositiva.',
    })

    renderManager()
    chooseFiles([image('a.jpg')])
    typeAlt('a.jpg', 'A')
    clickUpload('Subir 1 imagen')

    expect(
      await screen.findByText(/No se ha podido guardar la diapositiva\./),
    ).toBeInTheDocument()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'img/huerfana',
      kind: 'image',
    })
    expect(refreshRouter).not.toHaveBeenCalled()
  })

  it('una imagen que no pasa la validación local no llega a subirse', async () => {
    validateImageSelection.mockResolvedValue('La imagen supera los 5 MB.')

    renderManager()
    chooseFiles([image('grande.jpg')])
    typeAlt('grande.jpg', 'Grande')
    clickUpload('Subir 1 imagen')

    expect(
      await screen.findByText(/La imagen supera los 5 MB\./),
    ).toBeInTheDocument()
    expect(uploadImageToCloudinary).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledWith(null)
  })

  it('reintentar tras un fallo repite solo las filas con error y continúa el orden', async () => {
    uploadImageToCloudinary
      .mockResolvedValueOnce(uploadedImage('img/a'))
      .mockRejectedValueOnce(new Error('Falló b'))
      .mockResolvedValueOnce(uploadedImage('img/b2'))

    renderManager()
    chooseFiles([image('a.jpg'), image('b.jpg')])
    typeAlt('a.jpg', 'A')
    typeAlt('b.jpg', 'B')
    clickUpload('Subir 2 imágenes')

    await screen.findByText('1 subida correctamente, 1 con error.')
    // Solo queda pendiente la fila con error. El resumen aparece un instante
    // antes de que la cola se libere: se espera a que el botón vuelva a estar
    // activo, como haría una persona.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Subir 1 imagen' }),
      ).toBeEnabled(),
    )
    clickUpload('Subir 1 imagen')

    await screen.findByText('2 subidas correctamente.')
    expect(uploadImageToCloudinary).toHaveBeenCalledTimes(3)
    expect(
      addCaseCarouselImageAction.mock.calls.map(
        ([arg]) => arg.cloudinaryPublicId,
      ),
    ).toEqual(['img/a', 'img/b2'])
  })
})
