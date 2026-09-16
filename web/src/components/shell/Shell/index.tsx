import type { CSSProperties } from 'react'
import Link from 'next/link'
import styles from './Shell.module.css'
import { useShell } from './useShell'

type ShellProps = {
  children: React.ReactNode
}

type IconLinkItem = {
  href: string
  label: string
  icon: string
  external?: boolean
}

/**
 * Icono + pastilla con el nombre, en hover/focus (confirmado el 15 sep:
 * el icono cambia de color y crece un poco, y aparece una pastilla al
 * lado con el label — ej. "LinkedIn"). El icono se pinta con
 * mask-image + background-color en vez de <img>: los SVG traen
 * stroke="black" fijo, así que es la única forma de recolorearlos por
 * CSS sin tocar los 10 ficheros ni convertirlos en componentes React.
 */
function IconLink({ href, label, icon, external }: IconLinkItem) {
  const iconStyle = {
    '--icon-url': `url(/icons/${icon}.svg)`,
  } as CSSProperties

  const content = (
    <>
      <span className={styles.icon} style={iconStyle} aria-hidden="true" />
      <span className={styles.tooltip} aria-hidden="true">
        {label}
      </span>
    </>
  )

  if (external) {
    return (
      <a
        href={href}
        aria-label={label}
        className={styles.iconLink}
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={href} aria-label={label} className={styles.iconLink}>
      {content}
    </Link>
  )
}

/**
 * Shell público de Greener: menú lateral de iconos siempre visible (brief
 * §6), en tres bloques (logo / navegación / redes, confirmado por diseño
 * el 14 sep) + área de contenido. Vive en app/(public)/layout.tsx para no
 * remontarse al navegar entre home, casos, tools e insights (arquitectura
 * §24.3) — es también donde vive FeedProvider, así que este
 * componente es parte de por qué el feed sobrevive a esa navegación.
 */
export function Shell({ children }: ShellProps) {
  const { navItems, socialItems } = useShell()

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Navegación principal">
        <Link href="/" className={styles.logo} aria-label="Greener">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático servido tal cual, sin transformación */}
          <img src="/icons/logo_greener.svg" alt="" />
        </Link>

        <ul className={styles.navGroup}>
          {navItems.map((item) => (
            <li key={item.href}>
              <IconLink href={item.href} label={item.label} icon={item.icon} />
            </li>
          ))}
        </ul>

        <ul className={styles.socialGroup}>
          {socialItems.map((item) => (
            <li key={item.icon}>
              <IconLink
                href={item.href}
                label={item.label}
                icon={item.icon}
                external={item.external}
              />
            </li>
          ))}
        </ul>
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
