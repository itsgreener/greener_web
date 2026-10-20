import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'

import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'

import { talentAdminQueries } from '@/modules/talent/container'
import {
  CANDIDATE_STATUS_IN_PROCESS,
  CANDIDATE_STATUS_REPROCESSABLE,
} from '@/modules/talent/domain/talentConstants'
import { externalCvUrl } from '@/modules/talent/domain/talentCvLocation'

import CandidateActions from './CandidateActions'
import {
  CV_KIND_LABELS,
  EXPERIENCE_LABELS,
  LEVEL_LABELS,
  profileLabel,
  statusLabel,
  WORK_TYPE_LABELS,
} from '@/app/admin/(panel)/talent/talentLabels'

type Props = {
  params: Promise<{ id: string }>
}

function SafeLink({ href, children }: { href: string; children: string }) {
  const safe = externalCvUrl(href)

  return safe ? (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="admin-text-link"
    >
      {children}
    </a>
  ) : (
    <span>{children}</span>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <>
      <dt>{label}</dt>

      <dd>{children}</dd>
    </>
  )
}

function rate(value: number | null, unit: string) {
  return value === null ? null : `${value} € / ${unit}`
}

export default async function AdminTalentCandidatePage({ params }: Props) {
  const { id } = await params

  if (!z.uuid().safeParse(id).success) notFound()

  let detail: Awaited<ReturnType<typeof talentAdminQueries.detail>>

  try {
    detail = await talentAdminQueries.detail(id)
  } catch (error) {
    console.error('Talent: no se pudo leer al candidato', error)

    return (
      <main className="admin-contents-page">
        <div className="admin-dashboard-shell">
          <Link href="/admin/talent" className="admin-back-link">
            ← Candidatos
          </Link>

          <p className="admin-notice admin-notice-warning">
            No se ha podido leer Supabase-talent. Inténtalo de nuevo en un rato.
          </p>
        </div>
      </main>
    )
  }

  if (!detail) notFound()

  const canReprocess =
    CANDIDATE_STATUS_REPROCESSABLE.includes(detail.status) &&
    detail.cvKind === 'bucket'
  const canResend =
    Boolean(detail.email) &&
    !CANDIDATE_STATUS_IN_PROCESS.includes(detail.status)
  const rates = [rate(detail.rateDay, 'día'), rate(detail.rateHour, 'hora')]
    .filter(Boolean)
    .join(' · ')
  const languages = Object.entries(detail.languages)
  const socials = Object.entries(detail.socials)

  return (
    <main className="admin-contents-page">
      <div className="admin-dashboard-shell">
        <Link href="/admin/talent" className="admin-back-link">
          ← Candidatos
        </Link>

        <header className="admin-page-header">
          <div>
            <p className="admin-page-eyebrow">
              {statusLabel(detail.status)}
              {detail.blocked ? ' · Bloqueado' : ''}
            </p>

            <h1>{detail.name || detail.email || 'Candidato sin procesar'}</h1>

            <p className="admin-page-description">
              {detail.name && detail.email ? `${detail.email} · ` : ''}
              Alta: {formatAdminDateTime(detail.createdAt)} ·{' '}
              <Link
                href={`/admin/audit?entity=talent_candidate&entityId=${detail.id}`}
              >
                Ver actividad
              </Link>
            </p>
          </div>
        </header>

        <section className="admin-contents-card">
          <div className="admin-talent-actions">
            {detail.cvKind !== 'none' && (
              <a
                href={`/api/admin/talent/cv?candidate=${detail.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="admin-button admin-button-primary admin-link-button"
              >
                Ver CV ({CV_KIND_LABELS[detail.cvKind]}) ↗
              </a>
            )}
          </div>

          <CandidateActions
            candidateId={detail.id}
            canReprocess={canReprocess}
            canResend={canResend}
          />

          {detail.status === 'error' && (
            <p className="admin-notice admin-notice-warning">
              n8n marcó esta fila con error: email inválido o rechazado, fallo
              al descargar el CV o al actualizar la fila. Revisa el correo de
              error de n8n.
            </p>
          )}

          {detail.status === 'completed' && (
            <p className="admin-notice">
              El candidato ha enviado el formulario y n8n aún no ha terminado de
              procesarlo. Si lleva tiempo así, el procesado se ha cortado.
            </p>
          )}
        </section>

        <section className="admin-contents-card">
          <h2>Datos</h2>

          <dl className="admin-talent-data">
            <Row label="Email">{detail.email || '—'}</Row>

            <Row label="Teléfono">{detail.phone || '—'}</Row>

            <Row label="Perfil">
              {detail.profile.length > 0
                ? detail.profile.map(profileLabel).join(', ')
                : '—'}
            </Row>

            <Row label="Experiencia">
              {detail.experience
                ? (EXPERIENCE_LABELS[detail.experience] ?? detail.experience)
                : '—'}
            </Row>

            <Row label="Colaboración">
              {detail.workTypes.length > 0
                ? detail.workTypes
                    .map((value) => WORK_TYPE_LABELS[value] ?? value)
                    .join(', ')
                : '—'}
            </Row>

            <Row label="Tarifas">{rates || '—'}</Row>

            <Row label="Idiomas">
              {languages.length > 0
                ? languages
                    .map(
                      ([language, level]) =>
                        `${language} (${LEVEL_LABELS[level] ?? level})`,
                    )
                    .join(', ')
                : '—'}
            </Row>

            <Row label="Redes">
              {socials.length > 0
                ? socials.map(([network, url], index) => (
                    <span key={network}>
                      {index > 0 && ' · '}
                      <SafeLink href={url}>{network}</SafeLink>
                    </span>
                  ))
                : '—'}
            </Row>

            <Row label="Newsletter">
              {detail.newsletterAccepted === null
                ? '—'
                : detail.newsletterAccepted
                  ? 'Ha aceptado recibirla'
                  : 'No'}
            </Row>

            <Row label="Comentario">{detail.comment || '—'}</Row>

            <Row label="Valoración de la IA">{detail.aiComment || '—'}</Row>

            <Row label="Subido por">{detail.uploadedBy || '—'}</Row>

            <Row label="Nombre del CV">{detail.cvName || '—'}</Row>
          </dl>
        </section>

        <section className="admin-contents-card">
          <h2>Proyectos</h2>

          {detail.projects.length === 0 ? (
            <p className="admin-field-help">Sin proyectos.</p>
          ) : (
            <ul className="admin-talent-list">
              {detail.projects.map((project, index) => (
                <li key={`${project.link}-${index}`}>
                  <SafeLink href={project.link}>{project.link}</SafeLink>

                  {project.comment && <p>{project.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-contents-card">
          <h2>Ficheros</h2>

          {detail.files.length === 0 ? (
            <p className="admin-field-help">Sin ficheros sueltos.</p>
          ) : (
            <ul className="admin-talent-list">
              {detail.files.map((file) => (
                <li key={file.id}>
                  {file.kind === 'none' ? (
                    <span>Sin enlace</span>
                  ) : (
                    <a
                      href={`/api/admin/talent/cv?candidate=${detail.id}&file=${file.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-text-link"
                    >
                      {file.type || 'Fichero'} ↗
                    </a>
                  )}

                  <span className="admin-content-slug">
                    {CV_KIND_LABELS[file.kind]}
                    {file.status ? ` · ${file.status}` : ''}
                    {file.createdAt
                      ? ` · ${formatAdminDateTime(file.createdAt)}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
