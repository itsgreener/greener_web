import 'server-only'

import {
  mediaCleanup,
  mediaVerifier,
  warmScheduler,
} from '@/modules/media/container'

import { makeAttachPinImage } from './application/attachPinImage'
import { makeAttachPinVideo } from './application/attachPinVideo'
import {
  makeCreatePinWithImage,
  makeCreatePinWithVideo,
} from './application/createPinWithMedia'
import { makeCreatePin } from './application/createPin'
import { makeDeleteAllPins, makeDeletePin } from './application/deletePin'
import { makeDetachPinMedia } from './application/detachPinMedia'
import { makeUpdatePin } from './application/updatePin'
import { supabasePinMediaRepository } from './infrastructure/supabasePinMediaRepository'
import { supabasePinRepository } from './infrastructure/supabasePinRepository'

/** Composition root del módulo de pines. Ver `media/container.ts`. */

/** Lecturas de pines (la lista de un contenido): sin caso de uso intermedio. */
export const pins = supabasePinRepository

const pinMedia = supabasePinMediaRepository

export const createPin = makeCreatePin({ pins })

export const updatePin = makeUpdatePin({ pins })

export const deletePin = makeDeletePin({ pins, cleanup: mediaCleanup })

export const deleteAllPins = makeDeleteAllPins({ pins, cleanup: mediaCleanup })

export const attachPinImage = makeAttachPinImage({
  pinMedia,
  verifier: mediaVerifier,
})

export const attachPinVideo = makeAttachPinVideo({
  pinMedia,
  verifier: mediaVerifier,
  warm: warmScheduler,
})

export const detachPinMedia = makeDetachPinMedia({
  pinMedia,
  cleanup: mediaCleanup,
})

export const createPinWithImage = makeCreatePinWithImage({
  pins,
  pinMedia,
  verifier: mediaVerifier,
})

export const createPinWithVideo = makeCreatePinWithVideo({
  pins,
  pinMedia,
  verifier: mediaVerifier,
  warm: warmScheduler,
})
