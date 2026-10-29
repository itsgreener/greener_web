import 'server-only'

import { composeToolDocument } from './application/composeToolDocument'
import {
  makeDeleteHtmlPackageVersion,
  makeDeleteOldHtmlPackageVersions,
} from './application/deleteHtmlPackageVersion'
import { makePublishHtmlPackageVersion } from './application/publishHtmlPackageVersion'
import { makeSweepStagedUploads } from './application/sweepStagedUploads'
import {
  makePrepareHtmlPackageUpload,
  makeUploadHtmlPackage,
  makeUploadStagedHtmlPackage,
} from './application/uploadHtmlPackage'
import { cloudmersiveVirusScanner } from './infrastructure/cloudmersiveVirusScan'
import { supabaseHtmlPackageRepository } from './infrastructure/supabaseHtmlPackageRepository'
import { supabasePackageUploadStaging } from './infrastructure/supabasePackageUploadStaging'
import { supabaseStagedUploadSweeper } from './infrastructure/supabaseStagedUploadSweeper'
import { supabasePublishedPackageSource } from './infrastructure/supabaseStorageSource'
import { zipPackageValidator } from './infrastructure/zipValidation'

/** Composition root del módulo de paquetes HTML. Ver `media/container.ts`. */

/** Lecturas del ABM (versiones de un paquete): sin caso de uso intermedio. */
export const htmlPackages = supabaseHtmlPackageRepository

/** Lo que sirve la web pública de un paquete publicado. */
export const publishedPackages = supabasePublishedPackageSource

export { composeToolDocument }

export const uploadHtmlPackage = makeUploadHtmlPackage({
  packages: htmlPackages,
  validator: zipPackageValidator,
  scanner: cloudmersiveVirusScanner,
})

export const prepareHtmlPackageUpload = makePrepareHtmlPackageUpload({
  staging: supabasePackageUploadStaging,
})

export const uploadStagedHtmlPackage = makeUploadStagedHtmlPackage({
  staging: supabasePackageUploadStaging,
  upload: uploadHtmlPackage,
})

/** Limpieza semanal de la zona de paso (`GET /api/cron/cleanup-staging`). */
export const sweepStagedUploads = makeSweepStagedUploads({
  sweeper: supabaseStagedUploadSweeper,
})

export const publishHtmlPackageVersion = makePublishHtmlPackageVersion({
  packages: htmlPackages,
})

export const deleteHtmlPackageVersion = makeDeleteHtmlPackageVersion({
  packages: htmlPackages,
})

export const deleteOldHtmlPackageVersions = makeDeleteOldHtmlPackageVersions({
  packages: htmlPackages,
})
