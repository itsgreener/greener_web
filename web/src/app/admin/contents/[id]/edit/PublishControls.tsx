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

type Props = {
  contentId: string
  status: ContentStatus
  publishAt: string | null
}

const publishInitialState: PublishActionState = {}
const scheduleInitialState: ScheduleActionState = {}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
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

  const [rawPublishAt, setRawPublishAt] = useState('')
  const isoPublishAt = localDateTimeToIsoUtc(rawPublishAt)

  return (
    <div>
      <p>
        Estado actual: <strong>{status}</strong>
        {status === 'scheduled' && publishAt && (
          <> — programado para {formatDateTime(publishAt)}</>
        )}
        {status === 'published' && publishAt && (
          <> — publicado el {formatDateTime(publishAt)}</>
        )}
      </p>

      {status !== 'published' && (
        <form action={publishAction}>
          <input type="hidden" name="id" value={contentId} />

          <button type="submit" disabled={publishing}>
            {publishing ? 'Publicando...' : 'Publicar ahora'}
          </button>
        </form>
      )}

      {status !== 'published' && (
        <form action={scheduleAction}>
          <input type="hidden" name="id" value={contentId} />

          <input type="hidden" name="publishAt" value={isoPublishAt ?? ''} />

          <label htmlFor="publishAt-input">Programar para</label>

          <input
            id="publishAt-input"
            type="datetime-local"
            required
            value={rawPublishAt}
            onChange={(event) => setRawPublishAt(event.target.value)}
          />

          <button type="submit" disabled={scheduling || !isoPublishAt}>
            {scheduling ? 'Programando...' : 'Programar'}
          </button>

          {scheduleState.fieldErrors?.publishAt?.[0] && (
            <p>{scheduleState.fieldErrors.publishAt[0]}</p>
          )}

          {scheduleState.formError && <p>{scheduleState.formError}</p>}
        </form>
      )}

      {status !== 'draft' && (
        <form action={unpublishAction}>
          <input type="hidden" name="id" value={contentId} />

          <button type="submit" disabled={unpublishing}>
            {unpublishing
              ? 'Despublicando...'
              : status === 'scheduled'
                ? 'Cancelar programación'
                : 'Despublicar'}
          </button>
        </form>
      )}

      {publishState.error && <p>{publishState.error}</p>}
      {unpublishState.error && <p>{unpublishState.error}</p>}
    </div>
  )
}
