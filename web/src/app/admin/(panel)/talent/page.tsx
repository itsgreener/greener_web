import Link from 'next/link'

import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import { buildListHref } from '@/app/admin/_lib/listHref'
import { pluralize } from '@/app/admin/_lib/pluralize'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton, AdminButtonLink } from '@/components/admin/AdminButton'
import { AdminCard } from '@/components/admin/AdminCard'
import { AdminSelect } from '@/components/admin/AdminControls'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import {
  AdminFilterBar,
  AdminFilterClear,
  AdminFilterSearch,
  AdminResultBar,
} from '@/components/admin/AdminFilterBar'
import { AdminMessage } from '@/components/admin/AdminMessage'
import { AdminPage, AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminPagination } from '@/components/admin/AdminPagination'
import {
  AdminRowAction,
  AdminSubtext,
  AdminTable,
  AdminTableTitle,
  AdminTd,
} from '@/components/admin/AdminTable'
import { AdminTextLink } from '@/components/admin/AdminTextLink'
import { cx } from '@/lib/cx'
import { talentAdminQueries } from '@/modules/talent/container'
import {
  CANDIDATE_STATUS_FILTER_VALUES,
  PROFILE_VALUES,
} from '@/modules/talent/domain/talentConstants'
import {
  candidatePageCount,
  parseCandidateSearchQuery,
} from '@/modules/talent/domain/talentSearchQuery'

import styles from './page.module.css'
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
  const { q, status, profile } = filters

  return buildListHref('/admin/talent', { q, status, profile }, page)
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
    <AdminPage>
      <AdminPageHeader
        eyebrow="Talent"
        title="Candidatos"
        description={
          <>
            CVs y perfiles que llegan por el formulario de la web o los que sube
            el equipo. Cada vez que se abre un CV queda anotado en{' '}
            <Link href="/admin/audit?entity=talent_candidate">Actividad</Link>.
          </>
        }
        actions={
          <AdminButtonLink href="/admin/talent/upload" variant="primary">
            Subir CVs
          </AdminButtonLink>
        }
      />

      {params.deleted === '1' && (
        <div className={styles.notice}>
          <AdminMessage role="status">
            Candidato eliminado: sus datos, proyectos y ficheros del bucket ya
            no existen.
            {(params.drive === '1' || params.newsletter === '1') &&
              ' Quedan por quitar a mano:'}
            {params.drive === '1' && ' su CV en Google Drive'}
            {params.drive === '1' && params.newsletter === '1' && ' y'}
            {params.newsletter === '1' &&
              ' su suscripción en Mailchimp (audiencia de talent)'}
            {(params.drive === '1' || params.newsletter === '1') && '.'}
          </AdminMessage>
        </div>
      )}

      {result === null ? (
        <AdminMessage kind="warning">
          No se ha podido leer Supabase-talent. Comprueba las variables{' '}
          <code>TALENT_*</code> del servidor y el log; la web pública sigue
          funcionando.
        </AdminMessage>
      ) : (
        <AdminCard padded={false}>
          <div className={styles.statusRow} aria-label="Por estado">
            {CANDIDATE_STATUS_FILTER_VALUES.map((value) => (
              <Link
                key={value}
                href={pageHref({ q, status: value, profile }, 1)}
                className={cx(
                  styles.chip,
                  status === value && styles.chipActive,
                )}
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

          <AdminFilterBar key={`${q}|${status}|${profile}`}>
            <AdminFilterSearch
              id="talent-search"
              label="Buscar por nombre o email"
              defaultValue={q}
              placeholder="Buscar por nombre o email…"
            />

            <AdminSelect
              compact
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
            </AdminSelect>

            <AdminSelect
              compact
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
            </AdminSelect>

            <AdminButton type="submit">Filtrar</AdminButton>

            {hasFilters && <AdminFilterClear href="/admin/talent" />}
          </AdminFilterBar>

          <AdminResultBar>
            <span>
              {total} {pluralize(total, 'candidato', 'candidatos')}
            </span>
          </AdminResultBar>

          {result.items.length === 0 ? (
            <AdminEmptyState
              large
              title={hasFilters ? 'Sin resultados' : 'Aún no hay candidatos'}
              description={
                hasFilters
                  ? 'Prueba con otra búsqueda o limpia los filtros.'
                  : 'Los candidatos aparecerán aquí cuando alguien deje su email o se suba un CV.'
              }
            />
          ) : (
            <AdminTable flush>
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
                      <AdminTableTitle href={`/admin/talent/${item.id}`}>
                        {item.name || item.email || 'Sin procesar'}
                      </AdminTableTitle>

                      {item.name && item.email && (
                        <AdminSubtext>{item.email}</AdminSubtext>
                      )}

                      {item.uploadedBy && (
                        <AdminSubtext>
                          Subido por {item.uploadedBy}
                        </AdminSubtext>
                      )}
                    </td>

                    <td>
                      {item.profile.length > 0
                        ? item.profile.map(profileLabel).join(', ')
                        : '—'}
                    </td>

                    <td>
                      <AdminBadge>{statusLabel(item.status)}</AdminBadge>
                    </td>

                    <td>
                      {item.cvKind === 'none' ? (
                        '—'
                      ) : (
                        <AdminTextLink
                          href={`/api/admin/talent/cv?candidate=${item.id}`}
                          external
                        >
                          {CV_KIND_LABELS[item.cvKind]} ↗
                        </AdminTextLink>
                      )}

                      {item.filesCount > 0 && (
                        <AdminSubtext>
                          +{item.filesCount}{' '}
                          {pluralize(item.filesCount, 'fichero', 'ficheros')}
                        </AdminSubtext>
                      )}
                    </td>

                    <AdminTd variant="nowrap">
                      {formatAdminDateTime(item.createdAt)}
                    </AdminTd>

                    <AdminTd variant="end">
                      <AdminRowAction href={`/admin/talent/${item.id}`}>
                        Ver
                      </AdminRowAction>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          )}

          <AdminPagination
            page={query.page}
            pageCount={pageCount}
            previousHref={
              query.page > 1 ? pageHref(query, query.page - 1) : null
            }
            nextHref={
              query.page < pageCount ? pageHref(query, query.page + 1) : null
            }
          />
        </AdminCard>
      )}
    </AdminPage>
  )
}
