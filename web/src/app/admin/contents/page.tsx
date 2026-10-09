import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import Link from 'next/link'

import { listContents } from '@/modules/content/application/listContents'

type Props = {
  searchParams: Promise<{
    q?: string
    type?: string
    status?: string
  }>
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'case':
      return 'Case'

    case 'tool':
      return 'Tool'

    case 'insight':
      return 'Insight'

    case 'episode':
      return 'Episode'

    case 'other':
      return 'Other'

    default:
      return type
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'published':
      return 'Publicado'

    case 'scheduled':
      return 'Programado'

    case 'draft':
      return 'Borrador'

    default:
      return status
  }
}

function getLocaleLabel(locale: string) {
  switch (locale) {
    case 'es':
      return 'ES'

    case 'en':
      return 'EN'

    case 'ca':
      return 'CA'

    default:
      return locale.toUpperCase()
  }
}

export default async function ContentsPage({ searchParams }: Props) {
  const { q = '', type = '', status = '' } = await searchParams

  const contents = await listContents()

  const normalizedQuery = q.trim().toLowerCase()

  const filteredContents = contents.filter((content) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      content.title?.toLowerCase().includes(normalizedQuery) ||
      content.slug.toLowerCase().includes(normalizedQuery)

    const matchesType = !type || content.type === type

    const matchesStatus = !status || content.status === status

    return matchesQuery && matchesType && matchesStatus
  })

  const hasFilters = Boolean(normalizedQuery || type || status)

  return (
    <main className="admin-contents-page">
      <div className="admin-dashboard-shell">
        <header className="admin-page-header">
          <div>
            <p className="admin-page-eyebrow">Content management</p>

            <h1>Contents</h1>

            <p className="admin-page-description">
              Gestiona todos los contenidos publicados, programados y en
              borrador.
            </p>
          </div>

          <Link
            href="/admin/contents/new"
            className="admin-button admin-button-primary admin-link-button"
          >
            + Nuevo contenido
          </Link>
        </header>

        <section className="admin-contents-card">
          <form method="get" className="admin-content-filters">
            <div className="admin-content-search">
              <label htmlFor="content-search" className="admin-visually-hidden">
                Buscar contenidos
              </label>

              <input
                id="content-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Buscar por título o slug…"
              />
            </div>

            <select
              name="type"
              defaultValue={type}
              aria-label="Filtrar por tipo"
            >
              <option value="">Todos los tipos</option>

              <option value="case">Case</option>

              <option value="tool">Tool</option>

              <option value="insight">Insight</option>

              <option value="episode">Episode</option>

              <option value="other">Other</option>
            </select>

            <select
              name="status"
              defaultValue={status}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos los estados</option>

              <option value="published">Publicado</option>

              <option value="draft">Borrador</option>

              <option value="scheduled">Programado</option>
            </select>

            <button
              type="submit"
              className="admin-button admin-button-secondary"
            >
              Filtrar
            </button>

            {hasFilters && (
              <Link href="/admin/contents" className="admin-filter-clear">
                Limpiar
              </Link>
            )}
          </form>

          <div className="admin-content-results">
            <span>
              {filteredContents.length}{' '}
              {filteredContents.length === 1 ? 'contenido' : 'contenidos'}
            </span>

            {hasFilters && <small>de {contents.length} totales</small>}
          </div>

          {filteredContents.length === 0 ? (
            <div className="admin-empty-state admin-empty-state-large">
              <strong>No se han encontrado contenidos</strong>

              <p>Cambia los filtros o crea un nuevo contenido.</p>

              {hasFilters ? (
                <Link
                  href="/admin/contents"
                  className="admin-button admin-button-secondary admin-link-button"
                >
                  Quitar filtros
                </Link>
              ) : (
                <Link
                  href="/admin/contents/new"
                  className="admin-button admin-button-primary admin-link-button"
                >
                  + Nuevo contenido
                </Link>
              )}
            </div>
          ) : (
            <div className="admin-content-table-wrapper">
              <table className="admin-content-table">
                <thead>
                  <tr>
                    <th>Contenido</th>

                    <th>Tipo</th>

                    <th>Estado</th>

                    <th>Publicación</th>

                    <th>Idioma</th>

                    <th>
                      <span className="admin-visually-hidden">Acciones</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredContents.map((content) => (
                    <tr key={content.id}>
                      <td>
                        <Link
                          href={`/admin/contents/${content.id}/edit`}
                          className="admin-content-title"
                        >
                          {content.title || 'Sin título'}
                        </Link>

                        <span className="admin-content-slug">
                          /{content.slug}
                        </span>
                      </td>

                      <td>
                        <span className="admin-type-badge">
                          {getTypeLabel(content.type)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`admin-status admin-status-${content.status}`}
                        >
                          {getStatusLabel(content.status)}
                        </span>
                      </td>

                      <td className="admin-content-date">
                        {formatAdminDateTime(content.publishAt)}
                      </td>

                      <td>
                        <span className="admin-locale-badge">
                          {getLocaleLabel(content.defaultLocale)}
                        </span>
                      </td>

                      <td className="admin-content-action-cell">
                        <Link
                          href={`/admin/contents/${content.id}/edit`}
                          className="admin-row-action"
                          aria-label={`Editar ${content.title || content.slug}`}
                        >
                          Editar
                          <span>→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
