import {
  MOBILE_BREAKPOINT_PX,
  getPrefetchLimit,
} from '@/modules/media/domain/videoPlayback'

/**
 * Coordina el vídeo de todo el feed con DOS presupuestos independientes:
 *
 * 1. HUECOS DE REPRODUCCIÓN (arquitectura §9.3: 2 en escritorio, 1 en
 *    móvil): cuántos vídeos se reproducen a la vez. Cuentan para el mismo
 *    presupuesto tanto los pines de un único vídeo en modo "viewport" como
 *    el slide activo de un carrusel (show_as_carousel) — confirmado el 15
 *    sep: "dicho límite tiene que tener en cuenta los vídeos corriendo en
 *    un carrusel". El modo "hover" no compite aquí — ver PinCard/index.tsx.
 *
 *    Prioridad por candidato: mayor % visible primero, y a igualdad de
 *    visibilidad, el más cercano al centro del viewport (arquitectura §9.3:
 *    "cola priorizada por porcentaje visible y cercanía al centro"). Cuando
 *    se supera el límite, el candidato peor priorizado queda fuera (poster)
 *    hasta que se libera un hueco.
 *
 * 2. BILLETES DE PREFETCH (contrato de medios §6.2: 3 en escritorio, 2 en
 *    móvil): cuántos `<video>` pueden estar montados, ocultos bajo su
 *    póster, descargando para empezar sin tirones. Es un presupuesto APARTE
 *    de los huecos: un vídeo que se reproduce ya no necesita descargar de
 *    cero, y uno que se descarga todavía no se reproduce. Prioridad: primero
 *    quien tiene un hueco de reproducción (un vídeo que suena SIEMPRE tiene
 *    billete, por eso el tope de prefetch nunca baja del de huecos), y
 *    después los más cercanos al viewport.
 *
 * Clase pura, sin DOM ni React: cada card se suscribe de forma
 * imperativa (callbacks), así una actualización de scroll no provoca un
 * re-render de todas las tarjetas del feed — solo llama al callback de las
 * que de verdad cambian de estado. React solo entra por los hooks
 * useVideoSlot.ts y usePinVideo.ts, que conectan esto con el DOM.
 */

// Re-exportado: el valor vive en el dominio (único módulo de constantes de
// reproducción), pero este era su sitio histórico.
export { MOBILE_BREAKPOINT_PX }

export function getVideoSlotLimit(viewportWidth: number): number {
  return viewportWidth < MOBILE_BREAKPOINT_PX ? 1 : 2
}

interface Candidate {
  id: string
  visibleRatio: number
  distanceToCenter: number
  onActiveChange: (active: boolean) => void
}

/** Estado de cercanía de una tarjeta que aspira a un billete de prefetch. */
export interface PrefetchProximity {
  /** Dentro de la ventana de prefetch (una pantalla), con histéresis ya aplicada. */
  eligible: boolean
  /** Píxeles hasta el borde del viewport (0 si está dentro). */
  distanceToViewport: number
  /** Píxeles hasta el centro del viewport. */
  distanceToCenter: number
}

interface PrefetchCandidate extends PrefetchProximity {
  id: string
  onTicketChange: (hasTicket: boolean) => void
}

export class VideoPlaybackCoordinator {
  private candidates = new Map<string, Candidate>()
  private activeIds = new Set<string>()
  private prefetchCandidates = new Map<string, PrefetchCandidate>()
  private ticketIds = new Set<string>()
  private getViewportWidth: () => number

  constructor(getViewportWidth: () => number) {
    this.getViewportWidth = getViewportWidth
  }

  /** Da de alta un candidato con visibilidad 0 (todavía no observado) y devuelve cómo darlo de baja. */
  register(id: string, onActiveChange: (active: boolean) => void): () => void {
    this.candidates.set(id, {
      id,
      visibleRatio: 0,
      distanceToCenter: Number.POSITIVE_INFINITY,
      onActiveChange,
    })
    this.recompute()

    return () => {
      this.candidates.delete(id)
      const wasActive = this.activeIds.delete(id)
      if (wasActive) this.recompute()
    }
  }

  /** Actualiza la visibilidad de un candidato ya registrado (llamado desde el IntersectionObserver). */
  update(id: string, visibleRatio: number, distanceToCenter: number): void {
    const candidate = this.candidates.get(id)
    if (!candidate) return
    candidate.visibleRatio = visibleRatio
    candidate.distanceToCenter = distanceToCenter
    this.recompute()
  }

  /** ¿Tiene este candidato ahora mismo un hueco de reproducción? */
  hasSlot(id: string): boolean {
    return this.activeIds.has(id)
  }

  /** Da de alta una tarjeta que aspira a un billete de prefetch (no elegible hasta que se observe). */
  registerPrefetch(
    id: string,
    onTicketChange: (hasTicket: boolean) => void,
  ): () => void {
    this.prefetchCandidates.set(id, {
      id,
      eligible: false,
      distanceToViewport: Number.POSITIVE_INFINITY,
      distanceToCenter: Number.POSITIVE_INFINITY,
      onTicketChange,
    })
    this.recomputeTickets()

    return () => {
      this.prefetchCandidates.delete(id)
      const hadTicket = this.ticketIds.delete(id)
      if (hadTicket) this.recomputeTickets()
    }
  }

  /** Actualiza la cercanía de una tarjeta registrada para prefetch. */
  updatePrefetch(id: string, proximity: PrefetchProximity): void {
    const candidate = this.prefetchCandidates.get(id)
    if (!candidate) return
    candidate.eligible = proximity.eligible
    candidate.distanceToViewport = proximity.distanceToViewport
    candidate.distanceToCenter = proximity.distanceToCenter
    this.recomputeTickets()
  }

  /** ¿Tiene este candidato ahora mismo un billete de prefetch? */
  hasTicket(id: string): boolean {
    return this.ticketIds.has(id)
  }

  private recompute(): void {
    const limit = getVideoSlotLimit(this.getViewportWidth())

    const ranked = [...this.candidates.values()]
      .filter((c) => c.visibleRatio > 0)
      .sort((a, b) => {
        if (b.visibleRatio !== a.visibleRatio) {
          return b.visibleRatio - a.visibleRatio
        }
        return a.distanceToCenter - b.distanceToCenter
      })
      .slice(0, limit)

    const nextActive = new Set(ranked.map((c) => c.id))

    for (const candidate of this.candidates.values()) {
      const was = this.activeIds.has(candidate.id)
      const is = nextActive.has(candidate.id)
      if (was !== is) candidate.onActiveChange(is)
    }

    this.activeIds = nextActive

    // Quién suena condiciona quién tiene billete.
    this.recomputeTickets()
  }

  private recomputeTickets(): void {
    // Un vídeo con hueco SIEMPRE tiene billete: el límite nunca baja del de
    // huecos aunque se reconfigure.
    const limit = Math.max(
      getPrefetchLimit(this.getViewportWidth()),
      this.activeIds.size,
    )

    const ranked = [...this.prefetchCandidates.values()]
      .filter((c) => c.eligible)
      .sort((a, b) => {
        const aSlot = this.activeIds.has(a.id) ? 0 : 1
        const bSlot = this.activeIds.has(b.id) ? 0 : 1
        if (aSlot !== bSlot) return aSlot - bSlot
        if (a.distanceToViewport !== b.distanceToViewport) {
          return a.distanceToViewport - b.distanceToViewport
        }
        if (a.distanceToCenter !== b.distanceToCenter) {
          return a.distanceToCenter - b.distanceToCenter
        }
        // Orden total y estable: dos tarjetas empatadas no se disputan el
        // billete de un cálculo a otro.
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
      })
      .slice(0, limit)

    const nextTickets = new Set(ranked.map((c) => c.id))

    for (const candidate of this.prefetchCandidates.values()) {
      const was = this.ticketIds.has(candidate.id)
      const is = nextTickets.has(candidate.id)
      if (was !== is) candidate.onTicketChange(is)
    }

    this.ticketIds = nextTickets
  }
}

export const videoPlaybackCoordinator = new VideoPlaybackCoordinator(() =>
  typeof window === 'undefined' ? 1200 : window.innerWidth,
)
