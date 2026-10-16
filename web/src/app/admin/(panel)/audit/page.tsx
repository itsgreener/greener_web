import Link from 'next/link'

import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import { listAuditLog } from '@/modules/audit/container'
import {
  auditLogPageCount,
  parseAuditLogQuery,
} from '@/modules/audit/domain/auditLogQuery'
import type { AuditLogEntry } from '@/modules/audit/domain/auditLogRepository'

type Props = {
  searchParams: Promise<{
    q?: string
    entity?: string
    entityId?: string
    page?: string
  }>
}

function pageHref(
  filters: { q: string; entity: string; entityId: string },
  page: number,
) {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)

  if (filters.entity) params.set('entity', filters.entity)

  if (filters.entityId) params.set('entityId', filters.entityId)

  if (page > 1) params.set('page', String(page))

  const query = params.toString()

  return query ? `/admin/audit?${query}` : '/admin/audit'
}

/** Enlace a la ficha cuando la entidad es un contenido (puede estar borrado). */
function entityHref(entry: AuditLogEntry): string | null {
  return entry.entity === 'content' && entry.entityId
    ? `/admin/contents/${entry.entityId}/edit`
    : null
}

export default async function AuditLogPage({ searchParams }: Props) {
  const query = parseAuditLogQuery(await searchParams)
  const { q, entity, entityId } = query

  const { items, total } = await listAuditLog(query)

  const pageCount = auditLogPageCount(total, query.pageSize)
  const hasFilters = Boolean(q || entity || entityId)

  return (
    <main className="admin-contents-page">
      <div className="admin-dashboard-shell">
        <header className="admin-page-header">
          <div>
            <p className="admin-page-eyebrow">Trazabilidad</p>

            <h1>Actividad</h1>

            <p className="admin-page-description">
              Registro de lo que se ha hecho en el ABM y quién lo ha hecho. Es
              de solo lectura: no se puede editar ni borrar.
            </p>
          </div>
        </header>

        <section className="admin-contents-card">
          <form
            key={`${q}|${entity}|${entityId}`}
            method="get"
            className="admin-content-filters"
          >
            <div className="admin-content-search">
              <label htmlFor="audit-search" className="admin-visually-hidden">
                Buscar por persona o acción
              </label>

              <input
                id="audit-search"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Buscar por email o acción…"
              />
            </div>

            <select
              name="entity"
              defaultValue={entity}
              aria-label="Filtrar por entidad"
            >
              <option value="">Todas las entidades</option>

              <option value="content">Contenido</option>

              <option value="pin">Pin</option>

              <option value="media_asset">Medio</option>

              <option value="html_package_version">Paquete HTML</option>

              <option value="case_detail">Detalle de case</option>

              <option value="episode">Episode</option>

              <option value="other_detail">Other</option>
            </select>

            {entityId && (
              <input type="hidden" name="entityId" value={entityId} />
            )}

            <button
              type="submit"
              className="admin-button admin-button-secondary"
            >
              Filtrar
            </button>

            {hasFilters && (
              <Link href="/admin/audit" className="admin-filter-clear">
                Limpiar
              </Link>
            )}
          </form>

          {entityId && (
            <p className="admin-notice">
              Mostrando solo el historial de <code>{entityId}</code>.
            </p>
          )}

          <div className="admin-content-results">
            <span>
              {total} {total === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="admin-empty-state admin-empty-state-large">
              <strong>
                {hasFilters ? 'Sin resultados' : 'Aún no hay actividad'}
              </strong>

              <p>
                {hasFilters
                  ? 'Prueba con otra búsqueda o limpia los filtros.'
                  : 'Cuando alguien cree, edite o publique algo aparecerá aquí.'}
              </p>
            </div>
          ) : (
            <div className="admin-content-table-wrapper">
              <table className="admin-content-table">
                <thead>
                  <tr>
                    <th>Cuándo</th>

                    <th>Quién</th>

                    <th>Acción</th>

                    <th>Entidad</th>

                    <th>Detalle</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((entry) => {
                    const href = entityHref(entry)

                    return (
                      <tr key={entry.id}>
                        <td className="admin-content-date">
                          {formatAdminDateTime(entry.createdAt)}
                        </td>

                        <td>{entry.actorEmail}</td>

                        <td>
                          <code>{entry.action}</code>
                        </td>

                        <td>
                          <span className="admin-type-badge">
                            {entry.entity}
                          </span>

                          {entry.entityId &&
                            (href ? (
                              <Link href={href} className="admin-content-slug">
                                {entry.entityId.slice(0, 8)}…
                              </Link>
                            ) : (
                              <span className="admin-content-slug">
                                {entry.entityId.slice(0, 8)}…
                              </span>
                            ))}
                        </td>

                        <td>
                          {entry.payload === null ? (
                            '—'
                          ) : (
                            <details className="admin-audit-payload">
                              <summary>Ver</summary>

                              <pre>
                                {JSON.stringify(entry.payload, null, 2)}
                              </pre>
                            </details>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
