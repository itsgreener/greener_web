import {
  updatePinSchema,
  type UpdatePinInput,
} from '@/modules/pin/domain/pinSchema'
import type { PinRepository } from '@/modules/pin/domain/pinRepository'

export function makeUpdatePin({ pins }: { pins: PinRepository }) {
  return async function updatePin(input: UpdatePinInput) {
    return pins.update(updatePinSchema.parse(input))
  }
}
