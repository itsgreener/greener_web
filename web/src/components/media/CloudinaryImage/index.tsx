import type { ComponentProps } from 'react'

import {
  buildImageSrcSet,
  buildImageUrl,
  buildVideoPosterSrcSet,
  buildVideoPosterUrl,
  type VideoSize,
} from '@/modules/media/client/cloudinaryUrl'
import {
  IMAGE_DELIVERY,
  type MediaContext,
} from '@/modules/media/domain/mediaDelivery'

/** `sizes` de las imágenes de detalle: ocupan el 83 % del ancho de la ventana. */
export const DETAIL_IMAGE_SIZES = '83vw'

type Props = Omit<
  ComponentProps<'img'>,
  'src' | 'srcSet' | 'sizes' | 'alt' | 'children'
> & {
  publicId: string
  /** Una imagen, o el póster (primer fotograma) de un vídeo. */
  kind: 'image' | 'video'
  /** Perfil de entrega (calidad y escalera de anchos) del contrato de medios. */
  profile: MediaContext
  /**
   * Ancho del `src` de reserva, el que usa un navegador sin `srcset`. Debe ser
   * un escalón de la escalera del perfil: un ancho suelto crearía una versión
   * única en Cloudinary. Por defecto, el mayor.
   */
  srcWidth?: number
  /** Solo para vídeo: tamaño del póster del `src` (si no, `srcWidth`). */
  posterSize?: VideoSize
  /**
   * Con `srcset` (por defecto) o sin él. El póster de un vídeo solo tiene
   * `srcset` en el perfil `feed`, que es el que tiene escalera de pósters.
   */
  responsive?: boolean
  sizes?: string
  alt: string
}

/**
 * Imagen servida por Cloudinary: `src` y `srcset` salen de
 * `modules/media/client/cloudinaryUrl.ts`, que ya aplica calidad, formato y
 * ancho. Es el único `<img>` de Cloudinary con escalera de anchos de la web
 * (los otros dos son el SVG estático del Shell y el póster superpuesto del
 * vídeo de la ficha de tool) y por eso lleva el único `eslint-disable
 * no-img-element` de este caso: `next/image` volvería a transformar una URL
 * que ya viene transformada (arquitectura §9.2).
 */
export function CloudinaryImage({
  publicId,
  kind,
  profile,
  srcWidth,
  posterSize,
  responsive = true,
  sizes,
  alt,
  ...rest
}: Props) {
  const widths = IMAGE_DELIVERY[profile].widths
  const width = srcWidth ?? widths[widths.length - 1]

  const src =
    kind === 'image'
      ? buildImageUrl(publicId, profile, width)
      : buildVideoPosterUrl(publicId, posterSize ?? { width }, profile)

  let srcSet: string | undefined
  if (responsive) {
    if (kind === 'image') srcSet = buildImageSrcSet(publicId, profile)
    else if (profile === 'feed') srcSet = buildVideoPosterSrcSet(publicId)
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} {...rest} />
  )
}
