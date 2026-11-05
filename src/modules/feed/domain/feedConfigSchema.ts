import { z } from 'zod'

/**
 * Forma de `feed_config.ratios` (columna jsonb, así que Postgres no la
 * garantiza). Se valida al leerla en vez de fiarse del tipo `Json`.
 */
export const feedRatiosSchema = z.object({
  cases: z.number(),
  insights: z.number(),
  tools: z.number(),
  channel: z.number(),
  other: z.number(),
})
