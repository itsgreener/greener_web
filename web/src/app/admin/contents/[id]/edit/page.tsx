import Link from 'next/link'
import { notFound } from 'next/navigation'

import {
  getContent,
} from '@/modules/content/application/getContent'

import EditContentForm
  from './EditContentForm'

import DeleteContentButton
  from './DeleteContentButton'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function EditContentPage({
  params,
}: Props) {
  const { id } = await params

  const content =
    await getContent(id)

  if (!content) {
    notFound()
  }

  return (
    <main>
      <Link href="/admin/contents">
        ← Volver a contenidos
      </Link>

      <h1>Editar contenido</h1>

      <p>
        ID: {content.id}
      </p>

      <EditContentForm
        content={content}
      />

      <hr />

      <h2>Zona peligrosa</h2>

      <DeleteContentButton
        id={content.id}
        status={content.status}
      />
    </main>
  )
}