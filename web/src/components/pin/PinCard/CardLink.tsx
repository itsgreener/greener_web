import type { CSSProperties, ReactNode, Ref } from 'react'
import Link from 'next/link'

/**
 * Destinos que NO son páginas de Next sino route handlers que devuelven un
 * documento HTML propio (el paquete de una tool, un insight o una página satélite): necesitan una
 * carga completa, el router de Next no sabe navegar a ellos.
 */
const DOCUMENT_ROUTE = /^\/(tools|insights|variety)\/[^/]+\/app(\/|$)/

/**
 * Enlace de la tarjeta. Con un `<a>` plano cada clic
 * recargaba el documento: se perdía el estado de FeedProvider (sesión, pines
 * y scroll en memoria, arquitectura §6.2) y al volver se abría un feed nuevo.
 * Con `Link` la navegación es interna y (public)/layout.tsx no se desmonta.
 * `prefetch={false}`: con 40 pines por lote, precargar cada ficha (páginas
 * dinámicas) multiplicaría las peticiones al servidor sin necesidad.
 */
export function CardLink({
  href,
  children,
  ...props
}: {
  href: string
  children: ReactNode
  cardRef: Ref<HTMLAnchorElement>
  className: string
  style: CSSProperties
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: () => void
  onBlur: () => void
  onClick: () => void
}) {
  const { cardRef, ...anchorProps } = props

  if (DOCUMENT_ROUTE.test(href)) {
    return (
      <a ref={cardRef} href={href} {...anchorProps}>
        {children}
      </a>
    )
  }

  return (
    <Link ref={cardRef} href={href} prefetch={false} {...anchorProps}>
      {children}
    </Link>
  )
}
