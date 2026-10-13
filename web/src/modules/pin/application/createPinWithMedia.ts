import type { MediaVerifier } from '@/modules/media/domain/mediaVerification'
import type { WarmScheduler } from '@/modules/media/domain/warmScheduler'

import { CreatePinWithMediaError } from '@/modules/pin/domain/createPinWithMediaError'
import {
  attachPinImageSchema,
  attachPinVideoSchema,
  pinImageUploadSchema,
  type PinVideoUpload,
} from '@/modules/pin/domain/pinMediaSchema'
import type { PinMediaRepository } from '@/modules/pin/domain/pinMediaRepository'
import type { PinRepository } from '@/modules/pin/domain/pinRepository'
import {
  createPinSchema,
  type CreatePinInput,
} from '@/modules/pin/domain/pinSchema'

type Dependencies = {
  pins: PinRepository
  pinMedia: PinMediaRepository
  verifier: MediaVerifier
}

/** Borra el pin recién creado (best-effort): un pin sin medios no sirve para nada. */
async function discardPin(pins: PinRepository, pinId: string) {
  try {
    await pins.delete({ id: pinId })
  } catch (cleanupError) {
    console.error(cleanupError)
  }
}

async function inStage<T>(
  stage: ConstructorParameters<typeof CreatePinWithMediaError>[0],
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action()
  } catch (error) {
    throw new CreatePinWithMediaError(stage, error)
  }
}

export type CreatePinWithImageInput = {
  pin: CreatePinInput
  cloudinaryPublicId: string
}

export type CreatePinWithVideoInput = {
  pin: CreatePinInput
  /** Datos que dio el navegador, ya validados; se sustituyen por los reales. */
  video: PinVideoUpload
}

/**
 * Crea el pin y adjunta la imagen en una sola llamada (carga masiva).
 *
 * El archivo ya está en el almacén (lo subió el navegador), pero NO se fía
 * de sus metadatos: se consulta el archivo real y se valida en servidor.
 * Orden: 1. se verifica la imagen ANTES de crear
 * nada; 2. se crea el pin; 3. se adjunta, y si falla se borra el pin
 * recién creado. El archivo ya subido lo descarta el cliente.
 *
 * @throws CreatePinWithMediaError con el paso que falló
 */
export function makeCreatePinWithImage({
  pins,
  pinMedia,
  verifier,
}: Dependencies) {
  return async function createPinWithImage(
    input: CreatePinWithImageInput,
  ): Promise<{ pinId: string; mediaId: string }> {
    const verified = await inStage('verify', () =>
      verifier.verifyImage(input.cloudinaryPublicId),
    )

    // Los metadatos REALES del archivo también tienen que pasar el esquema.
    const preflight = pinImageUploadSchema.safeParse(verified)

    if (!preflight.success) {
      throw new CreatePinWithMediaError('invalid_media', preflight.error)
    }

    const pinId = await inStage('create_pin', () =>
      pins.create(createPinSchema.parse(input.pin)),
    )

    try {
      const mediaId = await pinMedia.attachImage(
        attachPinImageSchema.parse({ ...preflight.data, pinId }),
      )

      return { pinId, mediaId }
    } catch (error) {
      await discardPin(pins, pinId)

      throw new CreatePinWithMediaError('attach', error)
    }
  }
}

/**
 * Crea el pin y le adjunta un vídeo en una sola llamada (carga masiva de
 * pines con vídeo). Igual que la imagen, con dos diferencias:
 * los datos del navegador llegan ya validados (lo normal es que un vídeo
 * fuera de límites falle antes de consultar el almacén y no deje nada
 * creado), y si el SQL —la barrera autoritativa del límite por tipo de contenido— rechaza el
 * adjuntado se borra el pin. Al terminar encarga el calentamiento.
 *
 * @throws CreatePinWithMediaError con el paso que falló
 */
export function makeCreatePinWithVideo({
  pins,
  pinMedia,
  verifier,
  warm,
}: Dependencies & { warm: WarmScheduler }) {
  return async function createPinWithVideo(
    input: CreatePinWithVideoInput,
  ): Promise<{ pinId: string; mediaId: string }> {
    const verified = await inStage('verify', () =>
      verifier.verifyVideo(
        input.video.cloudinaryPublicId,
        input.video.durationSeconds,
      ),
    )

    const pinId = await inStage('create_pin', () =>
      pins.create(createPinSchema.parse(input.pin)),
    )

    let mediaId: string

    try {
      mediaId = await pinMedia.attachVideo(
        attachPinVideoSchema.parse({ ...input.video, ...verified, pinId }),
      )
    } catch (error) {
      await discardPin(pins, pinId)

      throw new CreatePinWithMediaError('attach', error)
    }

    await warm.forContent(input.pin.contentId)

    return { pinId, mediaId }
  }
}
