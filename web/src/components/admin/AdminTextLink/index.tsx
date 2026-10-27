import Link from 'next/link'

import { cx } from '@/lib/cx'

import styles from './AdminTextLink.module.css'

type Props = Omit<React.ComponentProps<'a'>, 'href'> & {
  href: string
  /** Enlace a otro sitio: se abre en pestaña nueva, sin `opener`. */
  external?: boolean
}

/** Enlace de texto en azul. Interno con `Link`; externo con `<a target="_blank">`. */
export function AdminTextLink({
  href,
  external = false,
  className,
  rel,
  children,
  ...props
}: Props) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel={rel ?? 'noopener noreferrer'}
        className={cx(styles.link, className)}
        {...props}
      >
        {children}
      </a>
    )
  }

  return (
    <Link href={href} className={cx(styles.link, className)} {...props}>
      {children}
    </Link>
  )
}
