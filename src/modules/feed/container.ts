import 'server-only'

import { makeCreateFeedSession } from './application/createFeedSession'
import { makeGetFeedSessionBatch } from './application/getFeedSessionBatch'
import { signedFeedCursor } from './infrastructure/cursor'
import { inMemoryFeedRequestLimits } from './infrastructure/feedRateLimit'
import { supabaseFeedSessionRepository } from './infrastructure/feedSessionRepository'
import { cachedFeedCatalog } from './infrastructure/cachedFeedCatalog'

/** Composition root del feed. Ver `media/container.ts`. */

export const feedLimits = inMemoryFeedRequestLimits

export const createFeedSession = makeCreateFeedSession({
  sessions: supabaseFeedSessionRepository,
})

export const getFeedSessionBatch = makeGetFeedSessionBatch({
  sessions: supabaseFeedSessionRepository,
  catalog: cachedFeedCatalog,
  cursors: signedFeedCursor,
})
