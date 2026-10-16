import {
  updateOtherFrequencySchema,
  type UpdateOtherFrequencyInput,
} from '@/modules/content/domain/otherSchema'
import type { OtherRepository } from '@/modules/content/domain/otherRepository'

export function makeUpdateOtherFrequency({
  others,
}: {
  others: OtherRepository
}) {
  return async function updateOtherFrequency(input: UpdateOtherFrequencyInput) {
    const validated = updateOtherFrequencySchema.parse(input)

    return others.updateFrequency(validated)
  }
}
