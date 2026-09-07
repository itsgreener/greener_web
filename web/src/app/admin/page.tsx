import Link from 'next/link'

export default function AdminPage() {
  return (
    <main>
      <h1>Greener Admin</h1>

      <p>Sesión iniciada correctamente.</p>

      <Link href="/admin/contents">Gestionar contenidos</Link>
    </main>
  )
}
