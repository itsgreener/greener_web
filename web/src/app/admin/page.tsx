import Link from 'next/link'

import { listContents } from '@/modules/content/application/listContents'

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return 'Sin publicar'
  }

  return new Date(value).toLocaleString(
    'es-ES',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  )
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

export default async function AdminPage() {
  const contents = await listContents()

  const published =
    contents.filter(
      (content) =>
        content.status === 'published',
    ).length

  const drafts =
    contents.filter(
      (content) =>
        content.status === 'draft',
    ).length

  const scheduled =
    contents.filter(
      (content) =>
        content.status === 'scheduled',
    ).length

  const recentContents = contents.slice(0, 6)

  return (
    <main className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <header className="admin-page-header">
          <div>
            <p className="admin-page-eyebrow">
              Greener Admin
            </p>

            <h1>Dashboard</h1>

            <p className="admin-page-description">
              Gestiona el contenido publicado y
              en preparación de Greener.
            </p>
          </div>

          <Link
            href="/admin/contents/new"
            className="admin-button admin-button-primary admin-link-button"
          >
            + Nuevo contenido
          </Link>
        </header>

        <section className="admin-stat-grid">
          <article className="admin-stat-card">
            <span className="admin-stat-label">
              Contents
            </span>

            <strong>
              {contents.length}
            </strong>

            <span className="admin-stat-caption">
              contenidos totales
            </span>
          </article>

          <article className="admin-stat-card">
            <span className="admin-stat-label">
              Published
            </span>

            <strong>
              {published}
            </strong>

            <span className="admin-stat-caption">
              visibles en producción
            </span>
          </article>

          <article className="admin-stat-card">
            <span className="admin-stat-label">
              Drafts
            </span>

            <strong>
              {drafts}
            </strong>

            <span className="admin-stat-caption">
              pendientes de publicación
            </span>
          </article>

          <article className="admin-stat-card">
            <span className="admin-stat-label">
              Scheduled
            </span>

            <strong>
              {scheduled}
            </strong>

            <span className="admin-stat-caption">
              publicaciones programadas
            </span>
          </article>
        </section>

        <section className="admin-dashboard-grid">
          <article className="admin-dashboard-card admin-dashboard-recent">
            <div className="admin-dashboard-card-heading">
              <div>
                <p className="admin-card-kicker">
                  Contenido
                </p>

                <h2>
                  Contenido reciente
                </h2>

                <p>
                  Accede rápidamente a los últimos
                  contenidos del sitio.
                </p>
              </div>

              <Link
                href="/admin/contents"
                className="admin-text-link"
              >
                Ver todos →
              </Link>
            </div>

            {recentContents.length === 0 ? (
              <div className="admin-empty-state">
                <strong>
                  Todavía no hay contenidos
                </strong>

                <p>
                  Crea el primer contenido para
                  empezar.
                </p>

                <Link
                  href="/admin/contents/new"
                  className="admin-button admin-button-primary admin-link-button"
                >
                  Crear contenido
                </Link>
              </div>
            ) : (
              <div className="admin-recent-list">
                {recentContents.map(
                  (content) => (
                    <Link
                      key={content.id}
                      href={`/admin/contents/${content.id}/edit`}
                      className="admin-recent-item"
                    >
                      <div className="admin-recent-main">
                        <strong>
                          {content.title ||
                            content.slug}
                        </strong>

                        <span>
                          /{content.slug}
                        </span>
                      </div>

                      <div className="admin-recent-meta">
                        <span className="admin-type-badge">
                          {getTypeLabel(
                            content.type,
                          )}
                        </span>

                        <span
                          className={`admin-status admin-status-${content.status}`}
                        >
                          {getStatusLabel(
                            content.status,
                          )}
                        </span>

                        <span className="admin-recent-date">
                          {formatDateTime(
                            content.publishAt,
                          )}
                        </span>

                        <span className="admin-recent-arrow">
                          →
                        </span>
                      </div>
                    </Link>
                  ),
                )}
              </div>
            )}
          </article>

          <aside className="admin-dashboard-card admin-quick-actions">
            <div className="admin-dashboard-card-heading">
              <div>
                <p className="admin-card-kicker">
                  Acciones
                </p>

                <h2>
                  Acceso rápido
                </h2>

                <p>
                  Las tareas más frecuentes del
                  panel.
                </p>
              </div>
            </div>

            <div className="admin-quick-action-list">
              <Link
                href="/admin/contents/new"
                className="admin-quick-action"
              >
                <div>
                  <span className="admin-quick-action-icon">
                    +
                  </span>
                </div>

                <div>
                  <strong>
                    Crear contenido
                  </strong>

                  <span>
                    Añade un Case, Tool,
                    Insight o Episode.
                  </span>
                </div>

                <span>
                  →
                </span>
              </Link>

              <Link
                href="/admin/contents"
                className="admin-quick-action"
              >
                <div>
                  <span className="admin-quick-action-icon">
                    ▤
                  </span>
                </div>

                <div>
                  <strong>
                    Gestionar contenidos
                  </strong>

                  <span>
                    Edita, publica o revisa
                    contenido existente.
                  </span>
                </div>

                <span>
                  →
                </span>
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}