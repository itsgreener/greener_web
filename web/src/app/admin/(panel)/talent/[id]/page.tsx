import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'

import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'
import { adminButtonClass } from '@/components/admin/AdminButton'
import {
  AdminCard,
  AdminCardHeader,
  AdminCardText,
} from '@/components/admin/AdminCard'
import { AdminList } from '@/components/admin/AdminList'
import { AdminMessage } from '@/components/admin/AdminMessage'
import {
  AdminBackLink,
  AdminPage,
  AdminPageHeader,
} from '@/components/admin/AdminPage'
import { AdminSubtext } from '@/components/admin/AdminTable'
import { AdminTextLink } from '@/components/admin/AdminTextLink'

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

import styles from './page.module.css'

type Props = {
  params: Promise<{ id: string }>
}

function SafeLink({ href, children }: { href: string; children: string }) {
  const safe = externalCvUrl(href)

  return safe ? (
    <AdminTextLink href={safe} rel="noopener noreferrer nofollow" external>
      {children}
    </AdminTextLink>
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
      <dt className={styles.term}>{label}</dt>

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
      <AdminPage>
        <AdminBackLink href="/admin/talent">← Candidatos</AdminBackLink>

        <AdminMessage kind="warning">
          No se ha podido leer Supabase-talent. Inténtalo de nuevo en un rato.
        </AdminMessage>
      </AdminPage>
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
    <AdminPage>
      <AdminBackLink href="/admin/talent">← Candidatos</AdminBackLink>

      <AdminPageHeader
        eyebrow={`${statusLabel(detail.status)}${detail.blocked ? ' · Bloqueado' : ''}`}
        title={detail.name || detail.email || 'Candidato sin procesar'}
        description={
          <>
            {detail.name && detail.email ? `${detail.email} · ` : ''}
            Alta: {formatAdminDateTime(detail.createdAt)} ·{' '}
            <Link
              href={`/admin/audit?entity=talent_candidate&entityId=${detail.id}`}
            >
              Ver actividad
            </Link>
          </>
        }
      />

      <div className={styles.stack}>
        <AdminCard>
          <div className={styles.toolbar}>
            {detail.cvKind !== 'none' && (
              <div>
                <a
                  href={`/api/admin/talent/cv?candidate=${detail.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={adminButtonClass({ variant: 'primary' })}
                >
                  Ver CV ({CV_KIND_LABELS[detail.cvKind]}) ↗
                </a>
              </div>
            )}

            <CandidateActions
              candidateId={detail.id}
              canReprocess={canReprocess}
              canResend={canResend}
            />

            {detail.status === 'error' && (
              <AdminMessage kind="warning">
                n8n marcó esta fila con error: email inválido o rechazado, fallo
                al descargar el CV o al actualizar la fila. Revisa el correo de
                error de n8n.
              </AdminMessage>
            )}

            {detail.status === 'completed' && (
              <AdminMessage>
                El candidato ha enviado el formulario y n8n aún no ha terminado
                de procesarlo. Si lleva tiempo así, el procesado se ha cortado.
              </AdminMessage>
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Datos" />

          <dl className={styles.data}>
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
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Proyectos" />

          {detail.projects.length === 0 ? (
            <AdminCardText>Sin proyectos.</AdminCardText>
          ) : (
            <AdminList align="baseline">
              {detail.projects.map((project, index) => (
                <li key={`${project.link}-${index}`}>
                  <SafeLink href={project.link}>{project.link}</SafeLink>

                  {project.comment && (
                    <p className={styles.comment}>{project.comment}</p>
                  )}
                </li>
              ))}
            </AdminList>
          )}
        </AdminCard>

        <AdminCard>
          <AdminCardHeader title="Ficheros" />

          {detail.files.length === 0 ? (
            <AdminCardText>Sin ficheros sueltos.</AdminCardText>
          ) : (
            <AdminList align="baseline">
              {detail.files.map((file) => (
                <li key={file.id}>
                  {file.kind === 'none' ? (
                    <span>Sin enlace</span>
                  ) : (
                    <AdminTextLink
                      href={`/api/admin/talent/cv?candidate=${detail.id}&file=${file.id}`}
                      external
                    >
                      {file.type || 'Fichero'} ↗
                    </AdminTextLink>
                  )}

                  <AdminSubtext>
                    {CV_KIND_LABELS[file.kind]}
                    {file.status ? ` · ${file.status}` : ''}
                    {file.createdAt
                      ? ` · ${formatAdminDateTime(file.createdAt)}`
                      : ''}
                  </AdminSubtext>
                </li>
              ))}
            </AdminList>
          )}
        </AdminCard>
      </div>
    </AdminPage>
  )
}
