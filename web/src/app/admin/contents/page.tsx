import Link from 'next/link'

import { listContents } from '@/modules/content/application/listContents'

export default async function ContentsPage() {
  const contents = await listContents()

  return (
    <main>
      <h1>Contents</h1>

      <Link href="/admin/contents/new">Nuevo contenido</Link>

      {contents.length === 0 ? (
        <p>No hay contenidos.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Publicación</th>
              <th>Slug</th>
              <th>Idioma</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {contents.map((content) => (
              <tr key={content.id}>
                <td>{content.title}</td>

                <td>{content.type}</td>

                <td>{content.status}</td>

                <td>
                  {content.publishAt
                    ? new Date(content.publishAt).toLocaleString('es-ES', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : '—'}
                </td>

                <td>{content.slug}</td>

                <td>{content.defaultLocale}</td>

                <td>
                  <Link href={`/admin/contents/${content.id}/edit`}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
