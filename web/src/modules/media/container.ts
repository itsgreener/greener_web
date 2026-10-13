import 'server-only'

import { after } from 'next/server'

import { makeDeleteCoverMedia } from './application/deleteCoverMedia'
import { makeMediaCleanup } from './application/cleanupMedia'
import { makeRegisterCoverImage } from './application/registerCoverImage'
import { makeRegisterCoverVideo } from './application/registerCoverVideo'
import { makeWarmScheduler } from './application/warmAfterResponse'
import { makeContentWarming } from './application/warmContentMedia'
import {
  cloudinaryFileStore,
  cloudinaryMediaVerifier,
  cloudinaryVideoWarmer,
  createSignedImageUpload,
  createSignedVideoUpload,
} from './infrastructure/cloudinaryServer'
import { supabaseMediaAssetRepository } from './infrastructure/supabaseMediaAssetRepository'
import { supabaseMediaRefsRepository } from './infrastructure/supabaseMediaRefs'
import { supabaseWarmRepository } from './infrastructure/supabaseWarmRepository'

/**
 * Composition root del módulo de medios: único sitio que elige Supabase y
 * Cloudinary como implementaciones de los puertos. Los casos de uso de la
 * carpeta `application/` no importan infraestructura; las páginas, las
 * acciones y los demás módulos piden lo que necesitan a este fichero.
 */

export const mediaAssets = supabaseMediaAssetRepository

/** Comprobación de los archivos subidos por el navegador. */
export const mediaVerifier = cloudinaryMediaVerifier

export const mediaCleanup = makeMediaCleanup({
  refs: supabaseMediaRefsRepository,
  files: cloudinaryFileStore,
})

export const contentWarming = makeContentWarming({
  warmRepo: supabaseWarmRepository,
  warmer: cloudinaryVideoWarmer,
})

/** Calienta los vídeos DESPUÉS de responder (`after()` de Next). */
export const warmScheduler = makeWarmScheduler({
  warming: contentWarming,
  warmRepo: supabaseWarmRepository,
  defer: (task) => after(task),
})

export const registerCoverImage = makeRegisterCoverImage({
  media: mediaAssets,
  verifier: mediaVerifier,
})

export const registerCoverVideo = makeRegisterCoverVideo({
  media: mediaAssets,
  verifier: mediaVerifier,
  warm: warmScheduler,
})

export const deleteCoverMedia = makeDeleteCoverMedia({
  media: mediaAssets,
  cleanup: mediaCleanup,
})

/** Firmas para que el navegador suba directamente a Cloudinary. */
export const signedUploads = {
  image: createSignedImageUpload,
  video: createSignedVideoUpload,
}
