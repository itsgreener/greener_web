import Link from 'next/link'

import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'

import { talentAdminQueries } from '@/modules/talent/container'
import {
  CANDIDATE_STATUS_FILTER_VALUES,
  PROFILE_VALUES,
} from '@/modules/talent/domain/talentConstants'
import {
  candidatePageCount,
  parseCandidateSearchQuery,
} from '@/modules/talent/domain/talentSearchQuery'

import ProcessPendingPanel from './ProcessPendingPanel'
import { CV_KIND_LABELS, profileLabel, statusLabel } from './talentLabels'

type Props = {
  searchParams: Promise<{
    q?: string
    status?: string
    profile?: string
    page?: string
    /** Aviso tras «Eliminar candidato» (lo pone la acción al redirigir). */
    deleted?: string
    drive?: string
    newsletter?: string
  }>
}

function pageHref(
  filters: { q: string; status: string; profile: string },
  page: number,
) {
  const params = new URLSearchParams()

  if (filters.q) params.set('q', filters.q)

  if (filters.status) params.set('status', filters.status)

  if (filters.profile) params.set('profile', filters.profile)

  if (page > 1) params.set('page', String(page))

  const query = params.toString()

  return query ? `/admin/talent?${query}` : '/admin/talent'
}

export default async function AdminTalentPage({ searchParams }: Props) {
  const params = await searchParams
  const query = parseCandidateSearchQuery(params)
  const { q, status, profile } = query
  const hasFilters = Boolean(q || status || profile)

  let result: Awaited<ReturnType<typeof talentAdminQueries.search>> | null =
    null
  let counts: Record<string, number> = {}

  try {
    ;[result, counts] = await Promise.all([
      talentAdminQueries.search(query),
      talentAdminQueries.statusCounts(),
    ])
  } catch (error) {
    // Supabase-talent caído o sin variables: la página explica, no da un 500.
    console.error('Talent: no se pudo leer el listado', error)
  }

  const total = result?.total ?? 0
  const pageCount = candidatePageCount(total, query.pageSize)

  return (
    <main className="admin-contents-page">
      <div className="admin-dashboard-shell">
        <header className="admin-page-header">
          <div>
            <p className="admin-page-eyebrow">Talent</p>

            <h1>Candidatos</h1>

            <p className="admin-page-description">
              CVs y perfiles que llegan por el formulario de la web o los que
              sube el equipo. Cada vez que se abre un CV queda anotado en{' '}
              <Link href="/admin/audit?entity=talent_candidate">Actividad</Link>
              .
            </p>
          </div>

          <Link
            href="/admin/talent/upload"
            className="admin-button admin-button-primary admin-link-button"
          >
            Subir CVs
          </Link>
        </header>

        {params.deleted === '1' && (
          <p className="admin-notice" role="status">
            Candidato eliminado: sus datos, proyectos y ficheros del bucket ya
            no existen.
            {(params.drive === '1' || params.newsletter === '1') &&
              ' Quedan por quitar a mano:'}
            {params.drive === '1' && ' su CV en Google Drive'}
            {params.drive === '1' && params.newsletter === '1' && ' y'}
            {params.newsletter === '1' &&
              ' su suscripción en Mailchimp (audiencia de talent)'}
            {(params.drive === '1' || params.newsletter === '1') && '.'}
          </p>
        )}

        {result === null ? (
          <p className="admin-notice admin-notice-warning">
            No se ha podido leer Supabase-talent. Comprueba las variables{' '}
            <code>TALENT_*</code> del servidor y el log; la web pública sigue
            funcionando.
          </p>
        ) : (
          <section className="admin-contents-card">
            <div className="admin-talent-status-row" aria-label="Por estado">
              {CANDIDATE_STATUS_FILTER_VALUES.map((value) => (
                <Link
                  key={value}
                  href={pageHref({ q, status: value, profile }, 1)}
                  className={
                    status === value
                      ? 'admin-talent-chip admin-talent-chip-active'
                      : 'admin-talent-chip'
                  }
                >
                  {statusLabel(value)} <strong>{counts[value] ?? 0}</strong>
                </Link>
              ))}
            </div>

            {((counts.pending ?? 0) > 0 || (counts.started ?? 0) > 0) && (
              <ProcessPendingPanel
                pending={counts.pending ?? 0}
                started={counts.started ?? 0}
              />
            )}

            <form
              key={`${q}|${status}|${profile}`}
              method="get"
              className="admin-content-filters"
            >
              <div className="admin-content-search">
                <label
                  htmlFor="talent-search"
                  className="admin-visually-hidden"
                >
                  Buscar por nombre o email
                </label>

                <input
                  id="talent-search"
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Buscar por nombre o email…"
                />
              </div>

              <select
                name="status"
                defaultValue={status}
                aria-label="Filtrar por estado"
              >
                <option value="">Todos los estados</option>

                {CANDIDATE_STATUS_FILTER_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>

              <select
                name="profile"
                defaultValue={profile}
                aria-label="Filtrar por perfil"
              >
                <option value="">Todos los perfiles</option>

                {PROFILE_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {profileLabel(value)}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="admin-button admin-button-secondary"
              >
                Filtrar
              </button>

              {hasFilters && (
                <Link href="/admin/talent" className="admin-filter-clear">
                  Limpiar
                </Link>
              )}
            </form>

            <div className="admin-content-results">
              <span>
                {total} {total === 1 ? 'candidato' : 'candidatos'}
              </span>
            </div>

            {result.items.length === 0 ? (
              <div className="admin-empty-state admin-empty-state-large">
                <strong>
                  {hasFilters ? 'Sin resultados' : 'Aún no hay candidatos'}
                </strong>

                <p>
                  {hasFilters
                    ? 'Prueba con otra búsqueda o limpia los filtros.'
                    : 'Los candidatos aparecerán aquí cuando alguien deje su email o se suba un CV.'}
                </p>
              </div>
            ) : (
              <div className="admin-content-table-wrapper">
                <table className="admin-content-table">
                  <thead>
                    <tr>
                      <th>Candidato</th>

                      <th>Perfil</th>

                      <th>Estado</th>

                      <th>CV</th>

                      <th>Alta</th>

                      <th aria-label="Acciones" />
                    </tr>
                  </thead>

                  <tbody>
                    {result.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <Link
                            href={`/admin/talent/${item.id}`}
                            className="admin-content-title"
                          >
                            {item.name || item.email || 'Sin procesar'}
                          </Link>

                          {item.name && item.email && (
                            <span className="admin-content-slug">
                              {item.email}
                            </span>
                          )}

                          {item.uploadedBy && (
                            <span className="admin-content-slug">
                              Subido por {item.uploadedBy}
                            </span>
                          )}
                        </td>

                        <td>
                          {item.profile.length > 0
                            ? item.profile.map(profileLabel).join(', ')
                            : '—'}
                        </td>

                        <td>
                          <span className="admin-type-badge">
                            {statusLabel(item.status)}
                          </span>
                        </td>

                        <td>
                          {item.cvKind === 'none' ? (
                            '—'
                          ) : (
                            <a
                              href={`/api/admin/talent/cv?candidate=${item.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-text-link"
                            >
                              {CV_KIND_LABELS[item.cvKind]} ↗
                            </a>
                          )}

                          {item.filesCount > 0 && (
                            <span className="admin-content-slug">
                              +{item.filesCount}{' '}
                              {item.filesCount === 1 ? 'fichero' : 'ficheros'}
                            </span>
                          )}
                        </td>

                        <td className="admin-content-date">
                          {formatAdminDateTime(item.createdAt)}
                        </td>

                        <td>
                          <Link
                            href={`/admin/talent/${item.id}`}
                            className="admin-row-action"
                          >
                            Ver
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
        )}
      </div>
    </main>
  )
}
