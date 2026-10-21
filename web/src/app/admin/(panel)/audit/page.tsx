import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import { AdminBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
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
  AdminSubtext,
  AdminTable,
  AdminTd,
} from '@/components/admin/AdminTable'
import { listAuditLog } from '@/modules/audit/container'
import {
  auditLogPageCount,
  parseAuditLogQuery,
} from '@/modules/audit/domain/auditLogQuery'
import type { AuditLogEntry } from '@/modules/audit/domain/auditLogRepository'

import styles from './page.module.css'

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

/**
 * Enlace a la ficha cuando la entidad es un contenido o un candidato de
 * Talent (puede estar borrado).
 */
function entityHref(entry: AuditLogEntry): string | null {
  if (!entry.entityId) return null

  if (entry.entity === 'content') {
    return `/admin/contents/${entry.entityId}/edit`
  }

  return entry.entity === 'talent_candidate'
    ? `/admin/talent/${entry.entityId}`
    : null
}

export default async function AuditLogPage({ searchParams }: Props) {
  const query = parseAuditLogQuery(await searchParams)
  const { q, entity, entityId } = query

  const { items, total } = await listAuditLog(query)

  const pageCount = auditLogPageCount(total, query.pageSize)
  const hasFilters = Boolean(q || entity || entityId)

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Trazabilidad"
        title="Actividad"
        description="Registro de lo que se ha hecho en el ABM y quién lo ha hecho. Es de solo lectura: no se puede editar ni borrar."
      />

      <AdminCard padded={false}>
        <AdminFilterBar key={`${q}|${entity}|${entityId}`}>
          <AdminFilterSearch
            id="audit-search"
            label="Buscar por persona o acción"
            defaultValue={q}
            placeholder="Buscar por email o acción…"
          />

          <AdminSelect
            compact
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

            <option value="talent_candidate">Talent (candidato)</option>
          </AdminSelect>

          {entityId && <input type="hidden" name="entityId" value={entityId} />}

          <AdminButton type="submit">Filtrar</AdminButton>

          {hasFilters && <AdminFilterClear href="/admin/audit" />}
        </AdminFilterBar>

        {entityId && (
          <AdminMessage inset>
            Mostrando solo el historial de <code>{entityId}</code>.
          </AdminMessage>
        )}

        <AdminResultBar>
          <span>
            {total} {total === 1 ? 'registro' : 'registros'}
          </span>
        </AdminResultBar>

        {items.length === 0 ? (
          <AdminEmptyState
            large
            title={hasFilters ? 'Sin resultados' : 'Aún no hay actividad'}
            description={
              hasFilters
                ? 'Prueba con otra búsqueda o limpia los filtros.'
                : 'Cuando alguien cree, edite o publique algo aparecerá aquí.'
            }
          />
        ) : (
          <AdminTable flush>
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
                    <AdminTd variant="nowrap">
                      {formatAdminDateTime(entry.createdAt)}
                    </AdminTd>

                    <td>{entry.actorEmail}</td>

                    <td>
                      <code>{entry.action}</code>
                    </td>

                    <td>
                      <AdminBadge>{entry.entity}</AdminBadge>

                      {entry.entityId && (
                        <AdminSubtext href={href ?? undefined}>
                          {entry.entityId.slice(0, 8)}…
                        </AdminSubtext>
                      )}
                    </td>

                    <td>
                      {entry.payload === null ? (
                        '—'
                      ) : (
                        <details className={styles.payload}>
                          <summary>Ver</summary>

                          <pre>{JSON.stringify(entry.payload, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </AdminTable>
        )}

        <AdminPagination
          page={query.page}
          pageCount={pageCount}
          previousHref={query.page > 1 ? pageHref(query, query.page - 1) : null}
          nextHref={
            query.page < pageCount ? pageHref(query, query.page + 1) : null
          }
        />
      </AdminCard>
    </AdminPage>
  )
}
