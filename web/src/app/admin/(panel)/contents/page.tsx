import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import Link from 'next/link'

import { contents as contentRepository } from '@/modules/content/container'
import {
  contentPageCount,
  parseContentListQuery,
} from '@/modules/content/domain/contentListQuery'

type Props = {
  searchParams: Promise<{
    q?: string
    type?: string
    status?: string
    page?: string
  }>
}

function pageHref(
  filters: { q: string; type?: string; status?: string },
  page: number,
) {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)

  if (filters.type) params.set('type', filters.type)

  if (filters.status) params.set('status', filters.status)

  if (page > 1) params.set('page', String(page))

  const query = params.toString()

  return query ? `/admin/contents?${query}` : '/admin/contents'
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
  const query = parseContentListQuery(await searchParams)

  const { q, type = '', status = '' } = query

  const [{ items: filteredContents, total: filteredTotal }, counts] =
    await Promise.all([
      contentRepository.list(query),
      contentRepository.counts(),
    ])

  const totalContents = counts.published + counts.draft + counts.scheduled

  const pageCount = contentPageCount(filteredTotal, query.pageSize)

  const hasFilters = Boolean(q || type || status)

  return (
    <main className="admin-contents-page">
      <div className="admin-dashboard-shell">
        <header className="admin-page-header">
          <div>
            <p className="admin-page-eyebrow">Gestión de contenidos</p>

            <h1>Contenidos</h1>

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
              {filteredTotal} {filteredTotal === 1 ? 'contenido' : 'contenidos'}
            </span>

            {hasFilters && <small>de {totalContents} totales</small>}
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

          {pageCount > 1 && (
            <nav className="admin-pagination" aria-label="Paginación">
              {query.page > 1 ? (
                <Link href={pageHref(query, query.page - 1)} rel="prev">
                  ← Anterior
                </Link>
              ) : (
                <span aria-hidden="true">← Anterior</span>
              )}

              <span>
                Página {query.page} de {pageCount}
              </span>

              {query.page < pageCount ? (
                <Link href={pageHref(query, query.page + 1)} rel="next">
                  Siguiente →
                </Link>
              ) : (
                <span aria-hidden="true">Siguiente →</span>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  )
}
