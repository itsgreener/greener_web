import './admin.css'

/**
 * Raíz del ABM: solo carga los tokens (admin.css). La barra lateral vive en
 * (panel)/layout.tsx; el login, en (auth), no la lleva.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
