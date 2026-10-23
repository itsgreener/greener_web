'use client'

import Link, { useLinkStatus } from 'next/link'
import type { ComponentProps } from 'react'

import styles from './Cta.module.css'

/**
 * CTA de la web pública (ver Cta.module.css). Cuatro formas con el mismo
 * aspecto y los mismos estados (hover, foco, procesando):
 * - `CtaLink`: enlace interno de Next. Mientras Next navega, el botón se
 *   atenúa y no admite otro clic (p. ej. mientras se abre la tool).
 * - `CtaAnchor`: enlace externo (`<a>`), sin estado de espera.
 * - `CtaButton`: botón; `pending` lo desactiva mientras se procesa la
 *   operación (p. ej. el envío del formulario de contacto).
 * - `CtaLabel`: etiqueta que no es interactiva (la del pin).
 * La posición (márgenes, absolute…) la pone cada sitio con `className`.
 */
function join(className?: string) {
  return className ? `${styles.cta} ${className}` : styles.cta
}

/**
 * Marca invisible dentro del `<Link>`: `useLinkStatus` solo funciona en un
 * hijo del enlace, y el CSS del botón la detecta con `:has()`.
 */
function LinkPendingMark() {
  const { pending } = useLinkStatus()

  return <span hidden data-cta-pending={pending} />
}

export function CtaLink({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={join(className)}>
      {children}
      <LinkPendingMark />
    </Link>
  )
}

export function CtaAnchor({ className, ...props }: ComponentProps<'a'>) {
  return <a {...props} className={join(className)} />
}

export function CtaButton({
  className,
  pending = false,
  disabled,
  ...props
}: ComponentProps<'button'> & {
  /** Operación en curso: desactiva el botón y lo marca como ocupado. */
  pending?: boolean
}) {
  return (
    <button
      {...props}
      className={join(className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    />
  )
}

export function CtaLabel({ className, ...props }: ComponentProps<'span'>) {
  return <span {...props} className={join(className)} />
}
