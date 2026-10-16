import {
  createOtherSchema,
  type CreateOtherInput,
} from '@/modules/content/domain/otherSchema'
import type { OtherRepository } from '@/modules/content/domain/otherRepository'

export function makeCreateOther({ others }: { others: OtherRepository }) {
  return async function createOther(input: CreateOtherInput) {
    const validated = createOtherSchema.parse(input)

    return others.createDraft(validated)
  }
}
