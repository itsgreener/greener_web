import { buildVideoTransformations } from '../infrastructure/cloudinaryUrl'
import { warmVideoRenditions } from '../infrastructure/cloudinaryServer'
import {
  markWarmedWithService,
  markWarmedWithSession,
  readContentWarmInfo,
  type ContentWarmInfo,
  type WarmMarker,
} from '../infrastructure/supabaseWarmRepository'

import { planVideoWarming, warmContractId } from '../domain/warmPlan'

/**
 * Calentamiento de los vídeos de un contenido (fase 2 del contrato de
 * medios, contrato-medios-fase-1.md §9).
 *
 * Dos pasos, separados a propósito:
 *
 *  1. `prepareContentWarming`: LEE (con la sesión del admin) qué vídeos del
 *     contenido hay que calentar y con qué cadenas. Es rápido y es lo único
 *     que necesita la sesión.
 *  2. `runWarmJobs`: llama a Cloudinary y anota el resultado. Es lo que se
 *     deja para `after()`, que no tiene por qué conservar las cookies: por eso
 *     recibe ya los trabajos y anota con la clave de servicio.
 *
 * REGLAS
 *  - Idempotente: un vídeo cuyo `warmed_contract` ya coincide con el
 *    contrato vigente NO se vuelve a pedir. Repetir un `explicit` genera y
 *    cobra otra vez (comprobado el 8 oct 2026).
 *  - Un fallo NUNCA bloquea la publicación: se anota en `warm_error` y se
 *    devuelve en el resultado; el botón «Calentar» o el script lo reintentan.
 *  - Solo contenido publicado o programado (el borrador no se calienta: aún
 *    puede cambiar de ratio o desaparecer) salvo `includeDraft`, que usa el
 *    botón del ABM.
 *  - `force` repite también lo ya calentado (cobra de nuevo): solo para el
 *    script, con `--force`.
 */

export interface WarmJob {
  mediaId: string
  cloudinaryPublicId: string
  transformations: string[]
  contract: string
}

export interface WarmResult {
  warmed: number
  failed: number
}

export interface PrepareOptions {
  /** Incluye los borradores (botón del ABM). */
  includeDraft?: boolean
  /** Repite aunque figure calentado con el contrato vigente (cobra de nuevo). */
  force?: boolean
}

function planJobs(info: ContentWarmInfo, force: boolean): WarmJob[] {
  const jobs: WarmJob[] = []

  for (const candidate of info.candidates) {
    const renditions = planVideoWarming(candidate.usages)

    if (renditions.length === 0) continue

    const transformations = renditions.flatMap((rendition) =>
      buildVideoTransformations(rendition.profile, rendition.size),
    )

    const contract = warmContractId(transformations)

    if (!force && candidate.warmedContract === contract) continue

    jobs.push({
      mediaId: candidate.mediaId,
      cloudinaryPublicId: candidate.cloudinaryPublicId,
      transformations,
      contract,
    })
  }

  return jobs
}

export async function prepareContentWarming(
  contentId: string,
  { includeDraft = false, force = false }: PrepareOptions = {},
): Promise<WarmJob[]> {
  const info = await readContentWarmInfo(contentId)

  if (!includeDraft && info.status === 'draft') return []

  return planJobs(info, force)
}

/** Cuántos vídeos del contenido (sea cual sea su estado) están sin calentar. */
export async function countPendingWarming(contentId: string): Promise<number> {
  return planJobs(await readContentWarmInfo(contentId), false).length
}

function shortReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)

  return message.slice(0, 200)
}

export async function runWarmJobs(
  jobs: WarmJob[],
  mark: WarmMarker = markWarmedWithService,
): Promise<WarmResult> {
  const result: WarmResult = { warmed: 0, failed: 0 }

  for (const job of jobs) {
    try {
      await warmVideoRenditions(job.cloudinaryPublicId, job.transformations)
    } catch (error) {
      console.error(error)
      result.failed += 1

      try {
        await mark(job.mediaId, job.contract, shortReason(error))
      } catch (markError) {
        console.error(markError)
      }

      continue
    }

    try {
      await mark(job.mediaId, job.contract)
      result.warmed += 1
    } catch (markError) {
      // Cloudinary sí lo aceptó; solo falló anotarlo. Se contará como fallo
      // para que se vea, aunque un nuevo intento vuelva a pedirlo.
      console.error(markError)
      result.failed += 1
    }
  }

  return result
}

/** Botón «Calentar» del ABM: todo con la sesión del admin y en la misma petición. */
export async function warmContentMedia(
  contentId: string,
  options: PrepareOptions = {},
): Promise<WarmResult> {
  const jobs = await prepareContentWarming(contentId, options)

  return runWarmJobs(jobs, markWarmedWithSession)
}
