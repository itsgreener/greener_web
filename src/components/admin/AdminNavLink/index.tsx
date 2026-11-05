'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * ¿Es `href` la sección en la que está `pathname`? `/admin` (el Panel) solo
 * coincide exacto, porque es prefijo de todo el ABM; el resto, por prefijo
 * con límite de segmento: `/admin/contents` y `/admin/contents/123` sí,
 * `/admin/contents-old` no.
 */
export function isActiveAdminRoute(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Enlace de la barra lateral del ABM. Es lo único cliente de `AdminShell`: lo
 * justo para leer la ruta. El estilo de «aquí estás» cuelga de
 * `aria-current` en el CSS, así que lo visual y lo semántico no se separan.
 */
export function AdminNavLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <Link
      href={href}
      className={className}
      aria-current={isActiveAdminRoute(pathname, href) ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
