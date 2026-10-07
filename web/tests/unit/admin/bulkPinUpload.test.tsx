// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Carga masiva de pines con vídeo (5 oct 2026). Antes el `<input>` solo
 * aceptaba `image/*` y todo el flujo era de imágenes: no se podía cargar
 * ningún vídeo. Ahora un lote puede mezclar imágenes y vídeos
 * (MP4, WebM y MOV).
 */

const getSignedImageUpload = vi.fn()
const uploadImageToCloudinary = vi.fn()
const getSignedVideoUpload = vi.fn()
const uploadVideoToCloudinary = vi.fn()
const createPinWithImageAction = vi.fn()
const createPinWithVideoAction = vi.fn()
const discardUploadQuietly = vi.fn()
const readLocalVideoDuration = vi.fn()

vi.mock('@/modules/media/infrastructure/cloudinaryUpload', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/media/infrastructure/cloudinaryUpload')
  >('@/modules/media/infrastructure/cloudinaryUpload')

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

vi.mock('@/modules/media/infrastructure/readLocalVideoDuration', () => ({
  readLocalVideoDuration: (...args: unknown[]) =>
    readLocalVideoDuration(...args),
}))

vi.mock('@/app/admin/contents/[id]/edit/pinActions', () => ({
  createPinWithImageAction: (...args: unknown[]) =>
    createPinWithImageAction(...args),
  createPinWithVideoAction: (...args: unknown[]) =>
    createPinWithVideoAction(...args),
}))

vi.mock('@/app/admin/contents/[id]/edit/discardUpload', () => ({
  discardUploadQuietly: (...args: unknown[]) => discardUploadQuietly(...args),
}))

import BulkPinUpload from '@/app/admin/contents/[id]/edit/BulkPinUpload'
import { DERIVED_PIN_LABEL_TYPES } from '@/modules/pin/domain/derivedPinLabel'

const SIGNED = {
  timestamp: 1,
  signature: 's',
  folder: 'f',
  apiKey: 'k',
  cloudName: 'demo',
}

function uploadedVideo(overrides: Record<string, unknown> = {}) {
  return {
    public_id: 'greener/content/videos/demo',
    format: 'mp4',
    width: 1080,
    height: 1080,
    duration: 5,
    bytes: 1024 * 1024,
    ...overrides,
  }
}

function video(name = 'demo.mp4', type = 'video/mp4') {
  return new File(['x'.repeat(1024)], name, { type })
}

function image(name = 'foto.webp') {
  return new File(['x'.repeat(1024)], name, { type: 'image/webp' })
}

function renderBulk(
  contentType: 'tool' | 'case' | 'insight' | 'episode' | 'other' = 'tool',
  availableSlots = 8,
) {
  render(
    <BulkPinUpload
      contentId="11111111-1111-4111-8111-111111111111"
      contentType={contentType as never}
      availableSlots={availableSlots}
    />,
  )
}

function selectFiles(files: File[]) {
  const input = document.getElementById('bulk-files') as HTMLInputElement

  fireEvent.change(input, { target: { files } })
}

function clickUpload(count: number) {
  fireEvent.click(screen.getByRole('button', { name: `Subir ${count} pines` }))
}

beforeEach(() => {
  vi.clearAllMocks()
  getSignedImageUpload.mockResolvedValue(SIGNED)
  getSignedVideoUpload.mockResolvedValue(SIGNED)
  uploadImageToCloudinary.mockResolvedValue({
    public_id: 'greener/content/foto',
    format: 'webp',
    width: 800,
    height: 800,
    bytes: 1024,
  })
  uploadVideoToCloudinary.mockResolvedValue(uploadedVideo())
  readLocalVideoDuration.mockResolvedValue(5)
  createPinWithImageAction.mockResolvedValue({
    ok: true,
    pinId: 'p',
    mediaId: 'm',
  })
  createPinWithVideoAction.mockResolvedValue({
    ok: true,
    pinId: 'p',
    mediaId: 'm',
  })
  discardUploadQuietly.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BulkPinUpload — vídeos en la carga masiva (5 oct 2026)', () => {
  it('REGRESIÓN: el selector de archivos acepta vídeo (antes solo image/*)', () => {
    renderBulk()

    const accept = document
      .getElementById('bulk-files')!
      .getAttribute('accept')!

    expect(accept).toContain('image/*')
    expect(accept).toContain('video/*')
    // Respaldo por extensión para los .mov que el sistema no etiqueta como vídeo.
    expect(accept).toContain('.mov')
    expect(accept).toContain('.mp4')
    expect(accept).toContain('.webm')
  })

  it.each([
    ['demo.mp4', 'video/mp4'],
    ['demo.webm', 'video/webm'],
    ['demo.mov', 'video/quicktime'],
    ['demo.mov', ''], // sin MIME: se reconoce por la extensión
  ])(
    'un %s (%s) se reconoce como vídeo y se sube por el camino de vídeo',
    async (name, type) => {
      renderBulk()
      selectFiles([video(name, type)])

      clickUpload(1)

      await waitFor(() =>
        expect(createPinWithVideoAction).toHaveBeenCalledOnce(),
      )

      expect(uploadVideoToCloudinary).toHaveBeenCalledOnce()
      expect(uploadImageToCloudinary).not.toHaveBeenCalled()
      expect(createPinWithImageAction).not.toHaveBeenCalled()
    },
  )

  it('un lote mixto: cada archivo va por su camino, y la reproducción en feed por defecto es «al entrar en pantalla»', async () => {
    renderBulk()
    selectFiles([image(), video()])

    clickUpload(2)

    await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalledOnce())
    await waitFor(() => expect(createPinWithVideoAction).toHaveBeenCalledOnce())

    expect(createPinWithImageAction).toHaveBeenCalledWith(
      expect.objectContaining({ autoplayMode: null }),
    )
    expect(createPinWithVideoAction).toHaveBeenCalledWith(
      expect.objectContaining({
        autoplayMode: 'viewport',
        durationSeconds: 5,
        cloudinaryPublicId: 'greener/content/videos/demo',
      }),
    )
  })

  it('el modo de reproducción del lote se puede cambiar a «al pasar el ratón»', async () => {
    renderBulk()
    selectFiles([video()])

    fireEvent.change(
      screen.getByLabelText('Reproducción de los vídeos en el feed'),
      {
        target: { value: 'hover' },
      },
    )
    clickUpload(1)

    await waitFor(() =>
      expect(createPinWithVideoAction).toHaveBeenCalledWith(
        expect.objectContaining({ autoplayMode: 'hover' }),
      ),
    )
  })

  it('en un pin que NO es de tool, un vídeo de 12 s se rechaza antes de subir (límite 8 s)', async () => {
    readLocalVideoDuration.mockResolvedValue(12)
    renderBulk('case')
    selectFiles([video()])

    clickUpload(1)

    expect(
      await screen.findByText(
        'Error: El vídeo no puede superar los 8 segundos.',
      ),
    ).toBeInTheDocument()
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled()
  })

  it('en una tool, 12 s se admiten (límite 15 s)', async () => {
    readLocalVideoDuration.mockResolvedValue(12)
    uploadVideoToCloudinary.mockResolvedValue(uploadedVideo({ duration: 12 }))
    renderBulk('tool')
    selectFiles([video()])

    clickUpload(1)

    await waitFor(() => expect(createPinWithVideoAction).toHaveBeenCalledOnce())
  })

  it('si el navegador no sabe la duración (WebM sin cabecera) se sube igualmente, y manda la de Cloudinary', async () => {
    readLocalVideoDuration.mockResolvedValue(null)
    uploadVideoToCloudinary.mockResolvedValue(uploadedVideo({ duration: 20 }))
    renderBulk('tool')
    selectFiles([video('grabacion.webm', 'video/webm')])

    clickUpload(1)

    expect(
      await screen.findByText(/dura más de los 15 segundos/),
    ).toBeInTheDocument()
    expect(createPinWithVideoAction).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/content/videos/demo',
      kind: 'video',
    })
  })

  it('un vídeo de más de 15 MB en una tool se rechaza antes de subir si no se conoce su duración', async () => {
    readLocalVideoDuration.mockResolvedValue(null)
    renderBulk('tool')

    const big = video('grande.webm', 'video/webm')
    Object.defineProperty(big, 'size', { value: 16 * 1024 * 1024 })
    selectFiles([big])

    clickUpload(1)

    expect(
      await screen.findByText('Error: El vídeo supera los 15 MB.'),
    ).toBeInTheDocument()
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled()
  })

  it('si el servidor rechaza el vídeo, la fila muestra el error y se descarta el archivo subido', async () => {
    createPinWithVideoAction.mockResolvedValue({
      ok: false,
      error:
        'El vídeo supera el peso máximo de un pin (100 MB; 15 MB en las tools).',
    })
    renderBulk('tool')
    selectFiles([video()])

    clickUpload(1)

    expect(
      await screen.findByText(/Error: El vídeo supera el peso máximo/),
    ).toBeInTheDocument()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/content/videos/demo',
      kind: 'video',
    })
  })

  it('avisa (sin bloquear) si el ratio real del vídeo no es el del pin', async () => {
    uploadVideoToCloudinary.mockResolvedValue(
      uploadedVideo({ width: 1920, height: 1080 }),
    )
    renderBulk('tool') // ratio por defecto 1:1
    selectFiles([video()])

    clickUpload(1)

    expect(
      await screen.findByText(/Hecho\. Aviso: Su ratio real \(1920×1080/),
    ).toBeInTheDocument()
    expect(createPinWithVideoAction).toHaveBeenCalledOnce()
  })

  it('un vídeo con el ratio correcto no genera aviso', async () => {
    renderBulk('tool')
    selectFiles([video()])

    clickUpload(1)

    expect(await screen.findByText('Hecho')).toBeInTheDocument()
  })

  it('las imágenes siguen funcionando igual que antes', async () => {
    renderBulk('tool')
    selectFiles([image()])

    clickUpload(1)

    await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalledOnce())
    expect(createPinWithVideoAction).not.toHaveBeenCalled()
    expect(await screen.findByText('Hecho')).toBeInTheDocument()
  })
})

describe('BulkPinUpload — máximo de 8 pines por contenido (7 oct 2026)', () => {
  it('con 3 huecos libres solo admite 3 de 5 archivos y avisa de los descartados', () => {
    renderBulk('tool', 3)

    selectFiles([
      image('a.webp'),
      image('b.webp'),
      image('c.webp'),
      image('d.webp'),
      image('e.webp'),
    ])

    expect(
      screen.getByRole('button', { name: 'Subir 3 pines' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Solo quedan 3 huecos de pin/)).toBeInTheDocument()
    expect(screen.getByText(/se han descartado 2 archivos/)).toBeInTheDocument()
  })

  it('sin huecos libres no queda nada que subir', () => {
    renderBulk('tool', 0)

    selectFiles([image('a.webp')])

    expect(screen.queryByRole('button', { name: /Subir \d+ pines/ })).toBeNull()
    expect(screen.getByText(/Solo quedan 0 huecos/)).toBeInTheDocument()
  })

  it('con huecos de sobra no avisa de nada', () => {
    renderBulk('tool', 8)

    selectFiles([image('a.webp'), image('b.webp')])

    expect(screen.queryByText(/Solo quedan/)).toBeNull()
  })
})

describe('BulkPinUpload — quitar un archivo del lote antes de subir (7 oct 2026)', () => {
  it('quita la fila elegida y el botón pasa a subir menos pines', () => {
    renderBulk()

    selectFiles([image('a.webp'), image('b.webp'), image('c.webp')])
    expect(screen.getByText('b.webp')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar b.webp del lote' }),
    )

    expect(screen.queryByText('b.webp')).toBeNull()
    expect(screen.getByText('a.webp')).toBeInTheDocument()
    expect(screen.getByText('c.webp')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Subir 2 pines' }),
    ).toBeInTheDocument()
  })

  it('el archivo quitado no vuelve al cambiar un valor por defecto', () => {
    renderBulk()

    selectFiles([image('a.webp'), image('b.webp')])
    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar a.webp del lote' }),
    )

    fireEvent.change(screen.getByLabelText('Ratio por defecto'), {
      target: { value: '4:5' },
    })

    expect(screen.queryByText('a.webp')).toBeNull()
    expect(screen.getByText('b.webp')).toBeInTheDocument()
  })

  it('al quitar el último archivo desaparecen la tabla y el botón de subir', () => {
    renderBulk()

    selectFiles([image('a.webp')])
    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar a.webp del lote' }),
    )

    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: /Subir \d+ pines/ })).toBeNull()
  })

  it('solo lo que se queda en el lote se sube', async () => {
    renderBulk()

    selectFiles([image('a.webp'), image('b.webp')])
    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar a.webp del lote' }),
    )
    clickUpload(1)

    await screen.findByText('Hecho')
    expect(createPinWithImageAction).toHaveBeenCalledTimes(1)
  })

  it('ya no pide el orden en cola: se asigna solo', () => {
    renderBulk()

    expect(screen.queryByLabelText('Orden en cola inicial')).toBeNull()
    selectFiles([image('a.webp')])
    expect(screen.queryByRole('columnheader', { name: 'Orden' })).toBeNull()
  })
})

describe('BulkPinUpload — ratio leído del nombre del archivo', () => {
  function ratioSelectOf(filename: string) {
    const row = screen.getByText(filename).closest('tr') as HTMLElement

    return row.querySelectorAll('select')[0] as HTMLSelectElement
  }

  it('aplica la proporción del nombre y lo indica en la fila', () => {
    renderBulk()

    selectFiles([image('flap-4x5-img.webp'), image('glitch-916-video.webp')])

    expect(ratioSelectOf('flap-4x5-img.webp').value).toBe('4:5')
    expect(ratioSelectOf('glitch-916-video.webp').value).toBe('9:16')
    expect(screen.getAllByText('detectado del nombre')).toHaveLength(2)
  })

  it('si el nombre no trae proporción legible no aplica nada: queda el ratio por defecto', () => {
    renderBulk()

    fireEvent.change(screen.getByLabelText('Ratio por defecto'), {
      target: { value: '4:3' },
    })
    selectFiles([image('IMG_2034.webp'), image('flap-5x7-img.webp')])

    expect(ratioSelectOf('IMG_2034.webp').value).toBe('4:3')
    expect(ratioSelectOf('flap-5x7-img.webp').value).toBe('4:3')
    expect(screen.queryByText('detectado del nombre')).toBeNull()
  })

  it('el ratio del nombre gana al valor por defecto aunque este cambie después', () => {
    renderBulk()

    selectFiles([image('flap-2x3-img.webp'), image('suelto.webp')])
    fireEvent.change(screen.getByLabelText('Ratio por defecto'), {
      target: { value: '16:9' },
    })

    expect(ratioSelectOf('flap-2x3-img.webp').value).toBe('2:3')
    expect(ratioSelectOf('suelto.webp').value).toBe('16:9')
  })

  it('el CSV manda sobre el nombre del archivo', async () => {
    renderBulk()

    const csv = new File(
      ['filename,ratio\nflap-4x5-img.webp,1:1\n'],
      'plantilla.csv',
      { type: 'text/csv' },
    )

    selectFiles([image('flap-4x5-img.webp')])
    fireEvent.change(document.getElementById('bulk-csv') as HTMLInputElement, {
      target: { files: [csv] },
    })

    await waitFor(() =>
      expect(ratioSelectOf('flap-4x5-img.webp').value).toBe('1:1'),
    )
    expect(screen.queryByText('detectado del nombre')).toBeNull()
  })

  it('el admin puede corregirlo a mano y se sube el valor corregido', async () => {
    renderBulk()

    selectFiles([image('flap-4x5-img.webp')])
    fireEvent.change(ratioSelectOf('flap-4x5-img.webp'), {
      target: { value: '3:4' },
    })

    expect(screen.queryByText('detectado del nombre')).toBeNull()

    clickUpload(1)

    await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalled())
    expect(createPinWithImageAction).toHaveBeenCalledWith(
      expect.objectContaining({ ratio: '3:4' }),
    )
  })

  it('se sube con la proporción leída del nombre', async () => {
    renderBulk()

    selectFiles([image('flap-169-img.webp')])
    clickUpload(1)

    await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalled())
    expect(createPinWithImageAction).toHaveBeenCalledWith(
      expect.objectContaining({ ratio: '16:9' }),
    )
  })
})

describe('BulkPinUpload — aviso si el ratio no encaja con la imagen subida', () => {
  it('avisa cuando el nombre indica un ratio distinto al real, sin bloquear', async () => {
    renderBulk()

    uploadImageToCloudinary.mockResolvedValue({
      public_id: 'greener/content/foto',
      format: 'webp',
      width: 1080,
      height: 1080,
      bytes: 1024,
    })

    selectFiles([image('flap-4x5-img.webp')])
    clickUpload(1)

    await waitFor(() =>
      expect(
        screen.getByText(/Hecho\. Aviso: El nombre del archivo indica 4:5/),
      ).toBeInTheDocument(),
    )
    expect(createPinWithImageAction).toHaveBeenCalledWith(
      expect.objectContaining({ ratio: '4:5' }),
    )
  })

  it('no avisa cuando el nombre y la imagen coinciden', async () => {
    renderBulk()

    selectFiles([image('flap-1x1-img.webp')])
    clickUpload(1)

    await waitFor(() => expect(screen.getByText('Hecho')).toBeInTheDocument())
    expect(screen.queryByText(/Aviso/)).toBeNull()
  })

  it('con ratio por defecto o del CSV usa el aviso genérico del pin', async () => {
    renderBulk()

    fireEvent.change(screen.getByLabelText('Ratio por defecto'), {
      target: { value: '4:5' },
    })

    selectFiles([image('suelto.webp')])
    clickUpload(1)

    await waitFor(() =>
      expect(screen.getByText(/no es el del pin \(4:5\)/)).toBeInTheDocument(),
    )
  })

  it('funciona igual en un contenido de tipo other', async () => {
    renderBulk('other')

    selectFiles([image('banner-916-img.webp')])

    const row = screen.getByText('banner-916-img.webp').closest('tr')!

    expect((row.querySelectorAll('select')[0] as HTMLSelectElement).value).toBe(
      '9:16',
    )

    clickUpload(1)

    await waitFor(() =>
      expect(
        screen.getByText(/El nombre del archivo indica 9:16/),
      ).toBeInTheDocument(),
    )
  })
})

describe('BulkPinUpload — rótulo automático en case, episode e insight', () => {
  it.each(DERIVED_PIN_LABEL_TYPES)(
    '%s: no pide frase gancho y sube el pin de imagen con label null',
    async (type) => {
      renderBulk(type)

      selectFiles([image('flap-1x1-img.webp')])

      // Sin columna editable de frase gancho: el texto del feed es automático.
      expect(screen.getByText('Automático')).toBeInTheDocument()

      clickUpload(1)

      await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalled())
      expect(createPinWithImageAction).toHaveBeenCalledWith(
        expect.objectContaining({ label: null }),
      )
    },
  )

  it.each(DERIVED_PIN_LABEL_TYPES)(
    '%s: el pin de vídeo también se crea con label null',
    async (type) => {
      renderBulk(type)

      selectFiles([video()])
      clickUpload(1)

      await waitFor(() => expect(createPinWithVideoAction).toHaveBeenCalled())
      expect(createPinWithVideoAction).toHaveBeenCalledWith(
        expect.objectContaining({ label: null }),
      )
    },
  )

  it.each(['tool', 'other'] as const)(
    '%s: sigue enviando la frase gancho escrita',
    async (type) => {
      renderBulk(type)

      selectFiles([image('flap-1x1-img.webp')])
      clickUpload(1)

      await waitFor(() => expect(createPinWithImageAction).toHaveBeenCalled())
      expect(createPinWithImageAction).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'flap 1x1 img' }),
      )
    },
  )
})
