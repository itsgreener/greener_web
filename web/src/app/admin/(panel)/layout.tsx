import Link from 'next/link'

type Props = {
  children: React.ReactNode
}

export default function AdminPanelLayout({ children }: Props) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <Link href="/admin">
            <span className="admin-sidebar-brand-name">Greener</span>

            <span className="admin-sidebar-brand-label">Admin</span>
          </Link>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Administración">
          <Link href="/admin" className="admin-sidebar-link">
            <span className="admin-sidebar-icon">▦</span>
            Panel
          </Link>

          <Link href="/admin/contents" className="admin-sidebar-link">
            <span className="admin-sidebar-icon">▤</span>
            Contenidos
          </Link>

          <Link href="/admin/audit" className="admin-sidebar-link">
            <span className="admin-sidebar-icon">☰</span>
            Actividad
          </Link>
        </nav>

        <div className="admin-sidebar-bottom">
          <Link href="/" className="admin-sidebar-link" target="_blank">
            <span className="admin-sidebar-icon">↗</span>
            Ver web
          </Link>
        </div>
      </aside>

      <div className="admin-main">{children}</div>
    </div>
  )
}
