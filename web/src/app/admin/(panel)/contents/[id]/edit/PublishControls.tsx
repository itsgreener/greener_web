'use client'

import { useActionState, useState } from 'react'
import { formatAdminDateTime } from '@/app/admin/_lib/formatAdminDateTime'

import { AdminActionFormView } from '@/components/admin/AdminActionForm'
import { AdminStatusBadge } from '@/components/admin/AdminBadge'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminControls'
import { AdminField } from '@/components/admin/AdminField'
import { AdminMessage } from '@/components/admin/AdminMessage'

import type { ContentStatus } from '@/modules/shared/domain/contentStatus'
import { localDateTimeToIsoUtc } from './datetimeLocal'

import {
  publishContentAction,
  scheduleContentAction,
  unpublishContentAction,
  type PublishActionState,
  type ScheduleActionState,
} from './publishActions'

import {
  generatePreviewLinkAction,
  type PreviewLinkActionState,
} from './previewActions'

import styles from './PublishControls.module.css'

type Props = {
  contentId: string
  status: ContentStatus
  publishAt: string | null
  /** Los `other` no tienen vista previa de borrador (plan de other, §6.7). */
  previewAvailable?: boolean
}

const publishInitialState: PublishActionState = {}
const scheduleInitialState: ScheduleActionState = {}
const previewInitialState: PreviewLinkActionState = {}

export default function PublishControls({
  contentId,
  status,
  publishAt,
  previewAvailable = true,
}: Props) {
  const [publishState, publishAction, publishing] = useActionState(
    publishContentAction,
    publishInitialState,
  )

  const [scheduleState, scheduleAction, scheduling] = useActionState(
    scheduleContentAction,
    scheduleInitialState,
  )

  const [unpublishState, unpublishAction, unpublishing] = useActionState(
    unpublishContentAction,
    publishInitialState,
  )

  const [previewState, previewAction, generatingPreview] = useActionState(
    generatePreviewLinkAction,
    previewInitialState,
  )

  const [rawPublishAt, setRawPublishAt] = useState('')

  const isoPublishAt = localDateTimeToIsoUtc(rawPublishAt)

  return (
    <div className={styles.panel}>
      <div className={styles.status}>
        <AdminStatusBadge status={status} />

        {status === 'scheduled' && publishAt && (
          <small className={styles.date}>
            Programado para {formatAdminDateTime(publishAt)}
          </small>
        )}

        {status === 'published' && publishAt && (
          <small className={styles.date}>
            Publicado el {formatAdminDateTime(publishAt)}
          </small>
        )}
      </div>

      <div className={styles.actions}>
        {status !== 'published' && previewAvailable && (
          <AdminActionFormView
            action={previewAction}
            pending={generatingPreview}
            state={previewState}
            showMessages={false}
            hidden={{ id: contentId }}
            label="Preview"
            pendingLabel="Generando…"
          />
        )}

        {status !== 'published' && (
          <AdminActionFormView
            action={publishAction}
            pending={publishing}
            state={publishState}
            showMessages={false}
            hidden={{ id: contentId }}
            variant="primary"
            label="Publicar ahora"
            pendingLabel="Publicando…"
          />
        )}

        {status !== 'draft' && (
          <AdminActionFormView
            action={unpublishAction}
            pending={unpublishing}
            state={unpublishState}
            showMessages={false}
            hidden={{ id: contentId }}
            label={
              status === 'scheduled' ? 'Cancelar programación' : 'Despublicar'
            }
            pendingLabel="Despublicando…"
          />
        )}
      </div>

      {status !== 'published' && (
        <form action={scheduleAction} className={styles.schedule}>
          <input type="hidden" name="id" value={contentId} />

          <input type="hidden" name="publishAt" value={isoPublishAt ?? ''} />

          <AdminField
            label="Programar publicación"
            htmlFor="publishAt-input"
            error={scheduleState.fieldErrors?.publishAt?.[0]}
          >
            <div className={styles.scheduleControls}>
              <AdminInput
                id="publishAt-input"
                type="datetime-local"
                required
                value={rawPublishAt}
                onChange={(event) => setRawPublishAt(event.target.value)}
              />

              <AdminButton type="submit" disabled={scheduling || !isoPublishAt}>
                {scheduling ? 'Programando…' : 'Programar'}
              </AdminButton>
            </div>
          </AdminField>

          {scheduleState.formError && (
            <AdminMessage kind="error">{scheduleState.formError}</AdminMessage>
          )}
        </form>
      )}

      {previewState.url && (
        <div className={styles.preview}>
          <AdminField label="Link de preview" htmlFor="preview-url">
            <AdminInput
              id="preview-url"
              type="text"
              readOnly
              value={previewState.url}
              onFocus={(event) => event.currentTarget.select()}
            />
          </AdminField>

          <small className={styles.hint}>
            Caduca en 7 días. Haz clic en el campo para seleccionarlo.
          </small>
        </div>
      )}

      {previewState.error && (
        <AdminMessage kind="error">{previewState.error}</AdminMessage>
      )}

      {publishState.error && (
        <AdminMessage kind="error">{publishState.error}</AdminMessage>
      )}

      {unpublishState.error && (
        <AdminMessage kind="error">{unpublishState.error}</AdminMessage>
      )}
    </div>
  )
}
