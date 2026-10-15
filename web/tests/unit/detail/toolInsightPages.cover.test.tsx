import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PublicContent } from '@/modules/content/domain/publicContent'
import type { PublicPinCover } from '@/modules/content/domain/publicContent'

/**
 * G1 (auditoría de `other`, 14 oct): `/tools/{slug}` sin `?pin=` y
 * `/insights/{slug}` se pintaban sin medio. Aquí se llama a las páginas del
 * servidor con un lector falso y se comprueba qué portada reciben.
 */

const FIRST: PublicPinCover = {
  ratio: '9:16',
  alt: 'Primer pin',
  media: { kind: 'image', cloudinaryPublicId: 'pins/primero' },
}
const FROM_PIN: PublicPinCover = {
  ratio: '1:1',
  alt: 'Pin pedido',
  media: { kind: 'image', cloudinaryPublicId: 'pins/pedido' },
}

const reader = {
  pinCover: vi.fn(),
  firstPinCover: vi.fn(),
}
const resolvePreviewContext = vi.fn()

// El container real arrastra Supabase: se sustituye por el lector falso, pero
// `resolveDetailCover` es la función real (es la que se quiere probar).
vi.mock('@/modules/content/container', async () => ({
  resolvePreviewContext: (...args: unknown[]) => resolvePreviewContext(...args),
  resolveDetailCover: (
    await import('@/modules/content/application/resolveDetailCover')
  ).resolveDetailCover,
}))
vi.mock('@/components/detail/ToolInsightDetail', () => ({
  ToolInsightDetail: () => null,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  // Como el real: lanza para cortar la ejecución.
  redirect: (path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  },
}))

function content(type: 'tool'): PublicContent {
  return {
    id: 'content-1',
    type,
    slug: 'mi-contenido',
    defaultLocale: 'es',
    locale: 'es',
    availableLocales: ['es'],
    title: 'Contenido',
    seoTitle: null,
    seoDescription: null,
    summary: 'Resumen',
    highlight: null,
    body: null,
  }
}

type DetailProps = { cover: PublicPinCover | null }
type Rendered = { props: { children: { props: DetailProps } } }
const detailProps = (el: unknown) => (el as Rendered).props.children.props

beforeEach(() => {
  vi.clearAllMocks()
  reader.pinCover.mockImplementation(async (_id: string, pin: string) =>
    pin === 'pin-ok' ? FROM_PIN : null,
  )
  reader.firstPinCover.mockResolvedValue(FIRST)
})

describe('/tools/[slug]', () => {
  beforeEach(() => {
    resolvePreviewContext.mockResolvedValue({
      content: content('tool'),
      reader,
      isPreview: false,
    })
  })

  it('sin ?pin= pinta el primer pin como portada, con su ratio y su alt', async () => {
    const { default: ToolPage } =
      await import('@/app/(public)/(detail)/tools/[slug]/page')

    const el = await ToolPage({
      params: Promise.resolve({ slug: 'mi-contenido' }),
      searchParams: Promise.resolve({}),
    })
    const props = detailProps(el)

    expect(props.cover?.media).toEqual(FIRST.media)
    expect(props.cover?.ratio).toBe('9:16')
    expect(props.cover?.alt).toBe('Primer pin')
  })

  it('con ?pin= válido sigue pintando el medio de ese pin', async () => {
    const { default: ToolPage } =
      await import('@/app/(public)/(detail)/tools/[slug]/page')

    const el = await ToolPage({
      params: Promise.resolve({ slug: 'mi-contenido' }),
      searchParams: Promise.resolve({ pin: 'pin-ok' }),
    })

    expect(detailProps(el).cover?.media).toEqual(FROM_PIN.media)
  })

  it('con ?pin= de otro contenido no inyecta nada ajeno: cae al primer pin', async () => {
    const { default: ToolPage } =
      await import('@/app/(public)/(detail)/tools/[slug]/page')

    const el = await ToolPage({
      params: Promise.resolve({ slug: 'mi-contenido' }),
      searchParams: Promise.resolve({ pin: 'pin-ajeno' }),
    })

    expect(detailProps(el).cover?.media).toEqual(FIRST.media)
  })

  it('el OG usa el mismo respaldo', async () => {
    const { generateMetadata } =
      await import('@/app/(public)/(detail)/tools/[slug]/page')

    const meta = await generateMetadata({
      params: Promise.resolve({ slug: 'mi-contenido' }),
      searchParams: Promise.resolve({}),
    })
    const images = (meta.openGraph as { images?: string[] } | null)?.images

    expect(images?.[0]).toContain('pins/primero')
  })

  it('sin ningún pin con medio la ficha se pinta sin portada (sin romper)', async () => {
    reader.firstPinCover.mockResolvedValue(null)
    const { default: ToolPage } =
      await import('@/app/(public)/(detail)/tools/[slug]/page')

    const el = await ToolPage({
      params: Promise.resolve({ slug: 'mi-contenido' }),
      searchParams: Promise.resolve({}),
    })

    expect(detailProps(el).cover).toBeNull()
  })
})

describe('/insights/[slug]', () => {
  it('redirige a /insights/[slug]/app sin leer nada de la base de datos', async () => {
    const { default: InsightPage } =
      await import('@/app/(public)/(detail)/insights/[slug]/page')

    await expect(
      InsightPage({ params: Promise.resolve({ slug: 'mi-contenido' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/insights/mi-contenido/app')

    expect(resolvePreviewContext).not.toHaveBeenCalled()
    expect(reader.firstPinCover).not.toHaveBeenCalled()
    expect(reader.pinCover).not.toHaveBeenCalled()
  })
})
