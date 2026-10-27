import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import { buildListHref, buildListQuery } from '@/app/admin/_lib/listHref'
import { pluralize } from '@/app/admin/_lib/pluralize'
import {
  AdminBadge,
  AdminLocaleBadge,
  AdminStatusBadge,
} from '@/components/admin/AdminBadge'
import { AdminButton, AdminButtonLink } from '@/components/admin/AdminButton'
import { AdminCard } from '@/components/admin/AdminCard'
import { AdminSelect } from '@/components/admin/AdminControls'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import {
  AdminFilterClear,
  AdminFilterSearch,
  AdminResultBar,
} from '@/components/admin/AdminFilterBar'
import {
  ContentStatusOptions,
  ContentTypeOptions,
} from '@/components/admin/AdminOptions'
import { AdminPage, AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminPagination } from '@/components/admin/AdminPagination'
import {
  AdminRowAction,
  AdminSubtext,
  AdminTable,
  AdminTableTitle,
  AdminTd,
} from '@/components/admin/AdminTable'
import { AdminVisuallyHidden } from '@/components/admin/AdminVisuallyHidden'
import { contentTypeLabel } from '@/components/admin/contentLabels'
import { localeCode } from '@/modules/shared/domain/locale'
import {
  contents as contentRepository,
  others as otherRepository,
} from '@/modules/content/container'
import {
  contentPageCount,
  parseContentListQuery,
} from '@/modules/content/domain/contentListQuery'
import {
  estimateOtherOccupation,
  otherKindLabel,
} from '@/modules/content/domain/otherSchema'

import ContentFilterBar from './ContentFilterBar'
import OtherOccupationNotice from './OtherOccupationNotice'

type Props = {
  searchParams: Promise<{
    q?: string
    type?: string
    status?: string
    page?: string
    // `?clear=1` (botón «Limpiar»): olvida los filtros guardados.
    clear?: string
  }>
}

function pageHref(
  filters: { q: string; type?: string; status?: string },
  page: number,
) {
  const { q, type, status } = filters

  return buildListHref('/admin/contents', { q, type, status }, page)
}

export default async function ContentsPage({ searchParams }: Props) {
  const rawParams = await searchParams
  const query = parseContentListQuery(rawParams)

  const { q, type = '', status = '' } = query

  const [{ items: filteredContents, total: filteredTotal }, counts] =
    await Promise.all([
      contentRepository.list(query),
      contentRepository.counts(),
    ])

  // Con el filtro «Other», aviso de la ocupación del feed (plan de other,
  // §7.6). Si no se puede calcular, la lista sigue funcionando sin él.
  const otherOccupation =
    type === 'other'
      ? await otherRepository
          .listPublishedFrequencies()
          .then(estimateOtherOccupation)
          .catch((error: unknown) => {
            console.error(error)

            return null
          })
      : null

  const totalContents = counts.published + counts.draft + counts.scheduled

  const pageCount = contentPageCount(filteredTotal, query.pageSize)

  const hasFilters = Boolean(q || type || status)

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Gestión de contenidos"
        title="Contenidos"
        description="Gestiona todos los contenidos publicados, programados y en borrador."
        actions={
          <AdminButtonLink href="/admin/contents/new" variant="primary">
            + Nuevo contenido
          </AdminButtonLink>
        }
      />

      <AdminCard padded={false}>
        <ContentFilterBar
          key={`${q}|${type}|${status}`}
          search={buildListQuery({ q, type, status }, query.page)}
          clear={rawParams.clear === '1'}
        >
          <AdminFilterSearch
            id="content-search"
            label="Buscar contenidos"
            defaultValue={q}
            placeholder="Buscar por título o slug…"
          />

          <AdminSelect
            compact
            name="type"
            defaultValue={type}
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>

            <ContentTypeOptions />
          </AdminSelect>

          <AdminSelect
            compact
            name="status"
            defaultValue={status}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>

            <ContentStatusOptions />
          </AdminSelect>

          <AdminButton type="submit">Filtrar</AdminButton>

          {hasFilters && <AdminFilterClear href="/admin/contents?clear=1" />}
        </ContentFilterBar>

        {otherOccupation !== null && (
          <OtherOccupationNotice
            percent={otherOccupation}
            scope="con los Other publicados"
            inset
          />
        )}

        <AdminResultBar>
          <span>
            {filteredTotal}{' '}
            {pluralize(filteredTotal, 'contenido', 'contenidos')}
          </span>

          {hasFilters && <small>de {totalContents} totales</small>}
        </AdminResultBar>

        {filteredContents.length === 0 ? (
          <AdminEmptyState
            large
            title="No se han encontrado contenidos"
            description="Cambia los filtros o crea un nuevo contenido."
            action={
              hasFilters ? (
                <AdminButtonLink href="/admin/contents?clear=1">
                  Quitar filtros
                </AdminButtonLink>
              ) : (
                <AdminButtonLink href="/admin/contents/new" variant="primary">
                  + Nuevo contenido
                </AdminButtonLink>
              )
            }
          />
        ) : (
          <AdminTable flush>
            <thead>
              <tr>
                <th>Contenido</th>

                <th>Tipo</th>

                <th>Estado</th>

                <th>Publicación</th>

                <th>Idioma</th>

                <th>
                  <AdminVisuallyHidden>Acciones</AdminVisuallyHidden>
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredContents.map((content) => (
                <tr key={content.id}>
                  <td>
                    <AdminTableTitle
                      href={`/admin/contents/${content.id}/edit`}
                    >
                      {content.title || 'Sin título'}
                    </AdminTableTitle>

                    <AdminSubtext>/{content.slug}</AdminSubtext>
                  </td>

                  <td>
                    <AdminBadge>
                      {contentTypeLabel(content.type)}
                      {content.otherKind
                        ? ` · ${otherKindLabel(content.otherKind)}`
                        : ''}
                    </AdminBadge>
                  </td>

                  <td>
                    <AdminStatusBadge status={content.status} />
                  </td>

                  <AdminTd variant="nowrap">
                    {formatAdminDateTime(content.publishAt)}
                  </AdminTd>

                  <td>
                    <AdminLocaleBadge>
                      {localeCode(content.defaultLocale)}
                    </AdminLocaleBadge>
                  </td>

                  <AdminTd variant="end">
                    <AdminRowAction
                      href={`/admin/contents/${content.id}/edit`}
                      label={`Editar ${content.title || content.slug}`}
                    >
                      Editar
                      <span>→</span>
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
          previousHref={query.page > 1 ? pageHref(query, query.page - 1) : null}
          nextHref={
            query.page < pageCount ? pageHref(query, query.page + 1) : null
          }
        />
      </AdminCard>
    </AdminPage>
  )
}
