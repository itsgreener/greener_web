// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import {
  CloudinaryImage,
  DETAIL_IMAGE_SIZES,
} from '@/components/media/CloudinaryImage'
import {
  buildImageSrcSet,
  buildImageUrl,
  buildVideoPosterSrcSet,
  buildVideoPosterUrl,
} from '@/modules/media/client/cloudinaryUrl'

const ID = 'greener/content/abc123'

describe('CloudinaryImage', () => {
  it('imagen: src del mayor escalón del perfil y srcset completo', () => {
    render(
      <CloudinaryImage publicId={ID} kind="image" profile="feed" alt="x" />,
    )

    const img = screen.getByAltText('x')
    expect(img).toHaveAttribute('src', buildImageUrl(ID, 'feed', 640))
    expect(img).toHaveAttribute('srcset', buildImageSrcSet(ID, 'feed'))
  })

  it('srcWidth fija el ancho del src de reserva', () => {
    render(
      <CloudinaryImage
        publicId={ID}
        kind="image"
        profile="feed"
        srcWidth={320}
        alt="x"
      />,
    )

    expect(screen.getByAltText('x')).toHaveAttribute(
      'src',
      buildImageUrl(ID, 'feed', 320),
    )
  })

  it('responsive={false} no pone srcset', () => {
    render(
      <CloudinaryImage
        publicId={ID}
        kind="image"
        profile="detail"
        responsive={false}
        alt="x"
      />,
    )

    expect(screen.getByAltText('x')).not.toHaveAttribute('srcset')
  })

  it('vídeo en feed: póster y srcset de pósters', () => {
    render(
      <CloudinaryImage publicId={ID} kind="video" profile="feed" alt="v" />,
    )

    const img = screen.getByAltText('v')
    expect(img).toHaveAttribute(
      'src',
      buildVideoPosterUrl(ID, { width: 640 }, 'feed'),
    )
    expect(img).toHaveAttribute('srcset', buildVideoPosterSrcSet(ID))
  })

  it('vídeo en detalle: póster sin srcset (no hay escalera de pósters)', () => {
    render(
      <CloudinaryImage publicId={ID} kind="video" profile="detail" alt="v" />,
    )

    expect(screen.getByAltText('v')).not.toHaveAttribute('srcset')
  })

  it('posterSize manda sobre srcWidth en el póster del vídeo', () => {
    const size = { width: 480, height: 600 }
    render(
      <CloudinaryImage
        publicId={ID}
        kind="video"
        profile="feed"
        posterSize={size}
        srcWidth={320}
        alt="v"
      />,
    )

    expect(screen.getByAltText('v')).toHaveAttribute(
      'src',
      buildVideoPosterUrl(ID, size, 'feed'),
    )
  })

  it('reenvía sizes y el resto de atributos del <img>', () => {
    render(
      <CloudinaryImage
        publicId={ID}
        kind="image"
        profile="detail"
        sizes={DETAIL_IMAGE_SIZES}
        loading="lazy"
        width={100}
        height={50}
        alt="x"
      />,
    )

    const img = screen.getByAltText('x')
    expect(img).toHaveAttribute('sizes', '83vw')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('width', '100')
    expect(img).toHaveAttribute('height', '50')
  })
})
