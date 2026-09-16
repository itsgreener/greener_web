/**
 * Coordina cuántos vídeos pueden reproducirse a la vez en todo el feed
 * (arquitectura §9.3: 2 en escritorio, 1 en móvil). Cuentan para el mismo
 * presupuesto tanto los pines de un único vídeo en modo "viewport" como
 * el slide activo de un carrusel (show_as_carousel) — confirmado el 15
 * sep: "dicho límite tiene que tener en cuenta los vídeos corriendo en
 * un carrusel". El modo "hover" no compite aquí — ver PinCard/index.tsx.
 *
 * Prioridad por candidato: mayor % visible primero, y a igualdad de
 * visibilidad, el más cercano al centro del viewport (arquitectura §9.3:
 * "cola priorizada por porcentaje visible y cercanía al centro"). Cuando
 * se supera el límite, el candidato peor priorizado queda fuera (poster)
 * hasta que se libera un hueco.
 *
 * Clase pura, sin DOM ni React: cada card se suscribe de forma
 * imperativa (onActiveChange), así una actualización de scroll no
 * provoca un re-render de todas las tarjetas del feed — solo llama al
 * callback de las que de verdad cambian de estado. React solo entra por
 * el hook useVideoSlot.ts, que es quien conecta esto con el DOM.
 */

// Mismo umbral que el primer breakpoint del masonry (arquitectura §10.1:
// <640px = 2 columnas) — no hay un concepto de "móvil" propio en el
// resto del proyecto, así que se reutiliza este en vez de inventar otro.
export const MOBILE_BREAKPOINT_PX = 640

export function getVideoSlotLimit(viewportWidth: number): number {
  return viewportWidth < MOBILE_BREAKPOINT_PX ? 1 : 2
}

interface Candidate {
  id: string
  visibleRatio: number
  distanceToCenter: number
  onActiveChange: (active: boolean) => void
}

export class VideoPlaybackCoordinator {
  private candidates = new Map<string, Candidate>()
  private activeIds = new Set<string>()
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
  }
}

export const videoPlaybackCoordinator = new VideoPlaybackCoordinator(() =>
  typeof window === 'undefined' ? 1200 : window.innerWidth,
)
