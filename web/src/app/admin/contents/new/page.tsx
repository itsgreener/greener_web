import Link from 'next/link'

import NewContentForm
  from './NewContentForm'

export default function NewContentPage() {
  return (
    <main>
      <Link href="/admin/contents">
        ← Volver
      </Link>

      <h1>Nuevo contenido</h1>

      <NewContentForm />
    </main>
  )
}