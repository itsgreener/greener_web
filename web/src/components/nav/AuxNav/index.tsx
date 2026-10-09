'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './AuxNav.module.css'

/**
 * Menú auxiliar de la home y las subhomes (confirmado por diseño el 15
 * sep, captura de referencia) — texto plano alineado a la izquierda,
 * mismos destinos que el bloque de navegación del Shell más "All" al
 * principio. NO aparece en detalle ni en contacto — por eso vive como
 * componente aparte que cada página home/subhome añade explícitamente,
 * en vez de en el Shell (que sí es global a todo el sitio público).
 *
 * "We did it" apunta a /work (no a /, que ya es "All"): hoy /work sin
 * slug no existe todavía como subhome filtrada por caso — el motor de
 * feed no filtra por scope/etiqueta todavía (PROGRESO.md §3.6) — así
 * que de momento este enlace, como los de Podcasts/Insights/Tools,
 * lleva a una ruta que hoy da 404. Mismo estado que esos mismos
 * destinos ya tienen hoy en el Shell — no es una regresión nueva de
 * este componente.
 */
const AUX_NAV_ITEMS = [
  { href: '/', label: 'All' },
  { href: '/work', label: 'We did it' },
  { href: '/channel', label: 'Podcasts' },
  { href: '/insights', label: 'Insights' },
  { href: '/tools', label: 'Tools' },
  { href: '/contact', label: 'Contact' },
] as const

export function AuxNav() {
  const pathname = usePathname()

  return (
    <nav className={styles.nav} aria-label="Secciones">
      <ul className={styles.list}>
        {AUX_NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={styles.link}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
