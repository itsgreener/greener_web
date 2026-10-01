'use client'

import { useActionState, useState } from 'react'

import type { ContentStatus } from '@/modules/content/domain/contentRepository'

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

type Props = {
  contentId: string
  status: ContentStatus
  publishAt: string | null
}

const publishInitialState: PublishActionState = {}
const scheduleInitialState: ScheduleActionState = {}
const previewInitialState: PreviewLinkActionState = {}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function getStatusLabel(status: ContentStatus) {
  switch (status) {
    case 'draft':
      return 'Borrador'

    case 'scheduled':
      return 'Programado'

    case 'published':
      return 'Publicado'
  }
}

export default function PublishControls({
  contentId,
  status,
  publishAt,
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
    <div className="admin-publish-panel">
      <div className="admin-publish-status">
        <span className={`admin-status admin-status-${status}`}>
          {getStatusLabel(status)}
        </span>

        {status === 'scheduled' && publishAt && (
          <small>Programado para {formatDateTime(publishAt)}</small>
        )}

        {status === 'published' && publishAt && (
          <small>Publicado el {formatDateTime(publishAt)}</small>
        )}
      </div>

      <div className="admin-publish-actions">
        {status !== 'published' && (
          <form action={previewAction}>
            <input type="hidden" name="id" value={contentId} />

            <button
              type="submit"
              className="admin-button admin-button-secondary"
              disabled={generatingPreview}
            >
              {generatingPreview ? 'Generando...' : 'Preview'}
            </button>
          </form>
        )}

        {status !== 'published' && (
          <form action={publishAction}>
            <input type="hidden" name="id" value={contentId} />

            <button
              type="submit"
              className="admin-button admin-button-primary"
              disabled={publishing}
            >
              {publishing ? 'Publicando...' : 'Publicar ahora'}
            </button>
          </form>
        )}

        {status !== 'draft' && (
          <form action={unpublishAction}>
            <input type="hidden" name="id" value={contentId} />

            <button
              type="submit"
              className="admin-button admin-button-secondary"
              disabled={unpublishing}
            >
              {unpublishing
                ? 'Despublicando...'
                : status === 'scheduled'
                  ? 'Cancelar programación'
                  : 'Despublicar'}
            </button>
          </form>
        )}
      </div>

      {status !== 'published' && (
        <form action={scheduleAction} className="admin-schedule-form">
          <input type="hidden" name="id" value={contentId} />

          <input type="hidden" name="publishAt" value={isoPublishAt ?? ''} />

          <label htmlFor="publishAt-input">Programar publicación</label>

          <div className="admin-schedule-controls">
            <input
              id="publishAt-input"
              type="datetime-local"
              required
              value={rawPublishAt}
              onChange={(event) => setRawPublishAt(event.target.value)}
            />

            <button
              type="submit"
              className="admin-button admin-button-secondary"
              disabled={scheduling || !isoPublishAt}
            >
              {scheduling ? 'Programando...' : 'Programar'}
            </button>
          </div>

          {scheduleState.fieldErrors?.publishAt?.[0] && (
            <p className="admin-field-error">
              {scheduleState.fieldErrors.publishAt[0]}
            </p>
          )}

          {scheduleState.formError && (
            <p className="admin-form-error">{scheduleState.formError}</p>
          )}
        </form>
      )}

      {previewState.url && (
        <div className="admin-preview-result">
          <label htmlFor="preview-url">Link de preview</label>

          <small>
            Caduca en 7 días. Haz clic en el campo para seleccionarlo.
          </small>

          <input
            id="preview-url"
            type="text"
            readOnly
            value={previewState.url}
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}

      {previewState.error && (
        <p className="admin-form-error">{previewState.error}</p>
      )}

      {publishState.error && (
        <p className="admin-form-error">{publishState.error}</p>
      )}

      {unpublishState.error && (
        <p className="admin-form-error">{unpublishState.error}</p>
      )}
    </div>
  )
}
