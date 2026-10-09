import { describe, expect, it } from 'vitest'

import { idSchema } from '@/lib/validation/idSchema'

const VALID = '11111111-1111-4111-8111-111111111111'

describe('idSchema', () => {
  it('acepta un uuid', () => {
    expect(idSchema('content').safeParse(VALID).success).toBe(true)
  })

  it.each([
    ['content', 'El identificador del contenido no es válido'],
    ['pin', 'El identificador del pin no es válido'],
    ['media', 'El identificador del medio no es válido'],
    ['version', 'El identificador de la versión no es válido'],
  ] as const)(
    '%s: rechaza lo que no es uuid con su mensaje',
    (entity, message) => {
      const result = idSchema(entity).safeParse('no-es-un-uuid')

      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe(message)
    },
  )
})
