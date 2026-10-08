import type { PinRatioValue } from './closestRatio'
import { caseVideoRatio, toolInsightDetailRatio } from './detailVideoRatio'
import {
  DETAIL_VIDEO_RUNGS,
  detailVideoRungM,
  FEED_VIDEO_WIDTH,
  type VideoProfile,
} from './mediaDelivery'
import { canAnimateInFeed, type PinContentKind } from './mediaLimits'

/**
 * Plan de calentamiento de un vídeo (fase 2 del contrato de medios,
 * contrato-medios-fase-1.md §9): qué rendiciones (perfil × tamaño) hay que
 * generar por adelantado para que el primer visitante no espere a que
 * Cloudinary las cree al vuelo.
 *
 * Función PURA y sin Cloudinary: devuelve perfil y tamaño. Las cadenas las
 * construye después `buildVideoTransformations` (infrastructure), la misma
 * función que construye las URL de entrega: una sola fuente de verdad.
 *
 * Decisiones de Greener (7 oct 2026, §9.2): feed (ancho 480) + escalón M de
 * la ficha, siempre en los dos formatos (eso lo añade quien construye las
 * cadenas); nunca imágenes.
 *
 * CORRECCIÓN DEL 8 oct: el vídeo de la ficha de una TOOL también se calienta
 * en el escalón L. «Sin escalón L» (decisión del 7 oct) partía de que L no se
 * serviría, pero `useToolCoverVideo` sí lo pide (`pickDetailVideoRung`) en
 * pantallas grandes o con DPR alto, y el primer visitante tendría que
 * esperar a que Cloudinary lo generara (decenas de segundos, con el vídeo a
 * trompicones). El carrusel de caso y la portada de `other` solo usan M
 * (`detailVideoRungM`), así que ahí L no se calienta.
 */

/** Un tamaño de rendición de vídeo, igual que `VideoSize` de la entrega. */
export interface WarmSize {
  width: number
  height?: number
}

export interface WarmRendition {
  profile: VideoProfile
  size: WarmSize
}

/** Dónde se usa un vídeo. Un mismo vídeo puede tener varios usos. */
export type VideoUsage =
  | {
      kind: 'pin'
      /** Tipo del contenido al que pertenece el pin. */
      contentType: PinContentKind
      /** Ratio del pin (el de `pin.ratio`). */
      pinRatio: PinRatioValue
      /** Del `media_asset`; null = dato antiguo (se asume que se anima). */
      durationSeconds: number | null
      autoplayMode: 'viewport' | 'hover' | null
    }
  | {
      kind: 'caseCarousel'
      width: number
      height: number
    }
  | {
      kind: 'otherCover'
      /** `content.cover_ratio`; null = ratio por defecto de la ficha. */
      coverRatio: PinRatioValue | null
    }

function rungM(ratio: PinRatioValue): WarmSize {
  const { width, height } = detailVideoRungM(ratio)
  return { width, height }
}

function rungL(ratio: PinRatioValue): WarmSize {
  const { width, height } = DETAIL_VIDEO_RUNGS[ratio].L
  return { width, height }
}

function renditionsFor(usage: VideoUsage): WarmRendition[] {
  switch (usage.kind) {
    case 'pin': {
      const renditions: WarmRendition[] = []

      // Feed: solo si el vídeo puede llegar a animarse. Un pin sin
      // `autoplayMode` nunca se anima, y uno de más de 8 s solo enseña el
      // póster (PinCard: `isAnimatable` y `prefetchEnabled`): en los dos
      // casos nadie pide jamás la versión del feed y calentarla sería
      // pagar por algo que no se sirve.
      if (
        usage.autoplayMode !== null &&
        canAnimateInFeed(usage.durationSeconds)
      ) {
        renditions.push({
          profile: 'feed',
          size: { width: FEED_VIDEO_WIDTH },
        })
      }

      // Ficha: solo las tools muestran el vídeo del pin (`/tools/{slug}?pin=`),
      // con el ratio del propio pin y mudo. M y L: según la caja y el DPR de
      // cada visitante se pide uno u otro.
      if (usage.contentType === 'tool') {
        const ratio = toolInsightDetailRatio(usage.pinRatio, null)

        renditions.push(
          { profile: 'toolDetail', size: rungM(ratio) },
          { profile: 'toolDetail', size: rungL(ratio) },
        )
      }

      return renditions
    }

    case 'caseCarousel':
      return [
        {
          profile: 'caseDetail',
          size: rungM(caseVideoRatio(usage.width, usage.height)),
        },
      ]

    case 'otherCover':
      return [
        {
          profile: 'caseDetail',
          size: rungM(toolInsightDetailRatio(null, usage.coverRatio)),
        },
      ]
  }
}

function renditionKey(r: WarmRendition): string {
  return `${r.profile}:${r.size.width}x${r.size.height ?? 'auto'}`
}

/**
 * Rendiciones que hay que calentar para un vídeo con estos usos, sin
 * duplicados (un vídeo que sale en dos pines iguales no se pide dos veces)
 * y en un orden estable. Sin usos → nada.
 */
export function planVideoWarming(usages: VideoUsage[]): WarmRendition[] {
  const byKey = new Map<string, WarmRendition>()

  for (const usage of usages) {
    for (const rendition of renditionsFor(usage)) {
      byKey.set(renditionKey(rendition), rendition)
    }
  }

  return [...byKey.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, rendition]) => rendition)
}

/**
 * Identificador corto del contrato de calentamiento de un vídeo: un hash de
 * sus cadenas de eager. Se guarda en `media_asset.warmed_contract`; si
 * cambia el contrato de entrega (§4.7) o el plan del vídeo (otro ratio…),
 * el identificador cambia y el vídeo vuelve a figurar «sin calentar».
 *
 * FNV-1a de 32 bits en dos pasadas (ida y vuelta): suficiente para detectar
 * cambios entre un puñado de cadenas, sin depender de `node:crypto` en
 * domain/. No es criptográfico ni pretende serlo.
 */
export function warmContractId(transformations: string[]): string {
  const text = [...transformations].sort().join('\n')

  function fnv1a(input: string): number {
    let hash = 0x811c9dc5
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash
  }

  const forward = fnv1a(text).toString(16).padStart(8, '0')
  const backward = fnv1a([...text].reverse().join(''))
    .toString(16)
    .padStart(8, '0')

  return `w1-${forward}${backward}`
}
