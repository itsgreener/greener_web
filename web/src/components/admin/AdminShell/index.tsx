import Link from 'next/link'

import { signOutAction } from '@/app/admin/(panel)/authActions'
import { AdminBrand } from '@/components/admin/AdminBrand'

import styles from './AdminShell.module.css'

const NAV_ITEMS = [
  { href: '/admin', icon: '▦', label: 'Panel' },
  { href: '/admin/contents', icon: '▤', label: 'Contenidos' },
  { href: '/admin/talent', icon: '☺', label: 'Talent' },
  { href: '/admin/audit', icon: '☰', label: 'Actividad' },
] as const

/** Barra lateral + zona de contenido del panel. El login no la lleva. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.brand}>
          <AdminBrand />
        </Link>

        <nav className={styles.nav} aria-label="Administración">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              <span className={styles.icon}>{item.icon}</span>

              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.bottom}>
          <Link href="/" className={styles.link} target="_blank">
            <span className={styles.icon}>↗</span>
            Ver web
          </Link>

          <form action={signOutAction}>
            <button type="submit" className={styles.linkButton}>
              <span className={styles.icon}>↩</span>
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className={styles.main}>{children}</div>
    </div>
  )
}
