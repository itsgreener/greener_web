import {
  createPinSchema,
  type CreatePinInput,
} from '@/modules/pin/domain/pinSchema'
import type { PinRepository } from '@/modules/pin/domain/pinRepository'

export function makeCreatePin({ pins }: { pins: PinRepository }) {
  return async function createPin(input: CreatePinInput) {
    return pins.create(createPinSchema.parse(input))
  }
}
