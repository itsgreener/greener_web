import Link from 'next/link'

import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import { AdminBadge, AdminStatusBadge } from '@/components/admin/AdminBadge'
import { AdminButtonLink } from '@/components/admin/AdminButton'
import { AdminCard, AdminCardHeader } from '@/components/admin/AdminCard'
import { AdminEmptyState } from '@/components/admin/AdminEmptyState'
import { AdminPage, AdminPageHeader } from '@/components/admin/AdminPage'
import { AdminTextLink } from '@/components/admin/AdminTextLink'
import { contentTypeLabel } from '@/components/admin/contentLabels'
import { contents as contentRepository } from '@/modules/content/container'

import styles from './page.module.css'

/** Tareas más frecuentes del panel, en «Acceso rápido». */
const QUICK_LINKS = [
  {
    href: '/admin/contents/new',
    icon: '+',
    title: 'Crear contenido',
    text: 'Añade un Case, Tool, Insight o Episode.',
  },
  {
    href: '/admin/contents',
    icon: '▤',
    title: 'Gestionar contenidos',
    text: 'Edita, publica o revisa contenido existente.',
  },
] as const

export default async function AdminPanelPage() {
  const [counts, recent] = await Promise.all([
    contentRepository.counts(),
    contentRepository.list({ q: '', page: 1, pageSize: 6 }),
  ])

  const { published, draft: drafts, scheduled } = counts

  const total = published + drafts + scheduled

  const recentContents = recent.items

  const stats = [
    { label: 'Contenidos', value: total, caption: 'contenidos totales' },
    {
      label: 'Publicados',
      value: published,
      caption: 'visibles en producción',
    },
    {
      label: 'Borradores',
      value: drafts,
      caption: 'pendientes de publicación',
    },
    {
      label: 'Programados',
      value: scheduled,
      caption: 'publicaciones programadas',
    },
  ]

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Greener Admin"
        title="Panel"
        description="Gestiona el contenido publicado y en preparación de Greener."
        actions={
          <AdminButtonLink href="/admin/contents/new" variant="primary">
            + Nuevo contenido
          </AdminButtonLink>
        }
      />

      <section className={styles.stats}>
        {stats.map((stat) => (
          <AdminCard
            key={stat.label}
            as="article"
            padded={false}
            className={styles.stat}
          >
            <span className={styles.statLabel}>{stat.label}</span>

            <strong className={styles.statValue}>{stat.value}</strong>

            <span className={styles.statCaption}>{stat.caption}</span>
          </AdminCard>
        ))}
      </section>

      <section className={styles.grid}>
        <AdminCard as="article">
          <AdminCardHeader
            tight
            kicker="Contenido"
            title="Contenido reciente"
            description="Accede rápidamente a los últimos contenidos del sitio."
            actions={
              <AdminTextLink href="/admin/contents">Ver todos →</AdminTextLink>
            }
          />

          {recentContents.length === 0 ? (
            <AdminEmptyState
              title="Todavía no hay contenidos"
              description="Crea el primer contenido para empezar."
              action={
                <AdminButtonLink href="/admin/contents/new" variant="primary">
                  Crear contenido
                </AdminButtonLink>
              }
            />
          ) : (
            <div className={styles.recentList}>
              {recentContents.map((content) => (
                <Link
                  key={content.id}
                  href={`/admin/contents/${content.id}/edit`}
                  className={styles.recentItem}
                >
                  <div className={styles.recentMain}>
                    <strong className={styles.recentTitle}>
                      {content.title || content.slug}
                    </strong>

                    <span className={styles.recentSlug}>/{content.slug}</span>
                  </div>

                  <div className={styles.recentMeta}>
                    <AdminBadge>{contentTypeLabel(content.type)}</AdminBadge>

                    <AdminStatusBadge status={content.status} />

                    <span className={styles.recentDate}>
                      {formatAdminDateTime(content.publishAt, 'Sin publicar')}
                    </span>

                    <span className={styles.arrow}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </AdminCard>

        <AdminCard as="aside">
          <AdminCardHeader
            tight
            kicker="Acciones"
            title="Acceso rápido"
            description="Las tareas más frecuentes del panel."
          />

          <div className={styles.quickList}>
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={styles.quick}>
                <span className={styles.quickIcon}>{link.icon}</span>

                <div>
                  <strong className={styles.quickTitle}>{link.title}</strong>

                  <span className={styles.quickText}>{link.text}</span>
                </div>

                <span className={styles.arrow}>→</span>
              </Link>
            ))}
          </div>
        </AdminCard>
      </section>
    </AdminPage>
  )
}
