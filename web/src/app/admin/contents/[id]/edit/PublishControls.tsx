'use client'

import { useActionState } from 'react'

import type { ContentStatus } from '@/modules/content/domain/contentRepository'

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

          <label htmlFor="publishAt">Programar para</label>

          <input
            id="publishAt"
            name="publishAt"
            type="datetime-local"
            required
          />

          <button type="submit" disabled={scheduling}>
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
