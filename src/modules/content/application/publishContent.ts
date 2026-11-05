import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'

import {
  publishContentSchema,
  scheduleContentSchema,
  type PublishContentInput,
  type ScheduleContentInput,
} from '@/modules/content/domain/contentSchema'
import type { ContentRepository } from '@/modules/content/domain/contentRepository'

/**
 * Publicar o programar un contenido y, ya hecho, encargar el calentamiento
 * de sus vídeos para después de responder. El calentamiento nunca falla ni
 * retrasa la publicación (ver `WarmScheduler`).
 */
export function makePublishContent({
  contents,
  warm,
}: {
  contents: ContentRepository
  warm: WarmScheduler
}) {
  return async function publishContent(input: PublishContentInput) {
    const validated = publishContentSchema.parse(input)

    const id = await contents.publish(validated)

    await warm.forContent(validated.id)

    return id
  }
}

export function makeScheduleContent({
  contents,
  warm,
}: {
  contents: ContentRepository
  warm: WarmScheduler
}) {
  return async function scheduleContent(input: ScheduleContentInput) {
    const validated = scheduleContentSchema.parse(input)

    const id = await contents.schedule(validated)

    await warm.forContent(validated.id)

    return id
  }
}
