import Link from 'next/link'
import styles from './Shell.module.css'
import { useShell } from './useShell'

type ShellProps = {
  children: React.ReactNode
}

/**
 * Shell público de Greener: menú lateral de iconos siempre visible (brief
 * §6), en tres bloques (logo / navegación / redes, confirmado por diseño
 * el 14 sep) + área de contenido. Vive en app/(public)/layout.tsx para no
 * remontarse al navegar entre home, casos, tools e insights (arquitectura
 * §24.3) — es también donde vive HomeFeedProvider, así que este
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
              <Link href={item.href} aria-label={item.label} title={item.label}>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático servido tal cual, sin transformación */}
                <img src={`/icons/${item.icon}.svg`} alt="" />
              </Link>
            </li>
          ))}
        </ul>

        <ul className={styles.socialGroup}>
          {socialItems.map((item) => (
            <li key={item.icon}>
              {item.external ? (
                <a
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático servido tal cual, sin transformación */}
                  <img src={`/icons/${item.icon}.svg`} alt="" />
                </a>
              ) : (
                <Link
                  href={item.href}
                  aria-label={item.label}
                  title={item.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático servido tal cual, sin transformación */}
                  <img src={`/icons/${item.icon}.svg`} alt="" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
