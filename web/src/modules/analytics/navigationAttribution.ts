'use client'

/**
 * De qué sección venía la navegación que llevó a abrir un contenido
 * (arquitectura §18.2: `sourceSection` de "Case Open").
 *
 * `PinCard` guarda aquí la sección justo antes de navegar (al hacer clic);
 * la página de detalle la consume una sola vez al montarse, y solo si el
 * destino guardado coincide con la ruta actual — así una atribución vieja
 * nunca se asocia a una visita distinta a la que la originó.
 *
 * Vive en sessionStorage, no en el contenido del evento en sí, porque el
 * clic ocurre en un componente (PinCard) y la lectura en otro (la página
 * de destino, tras una navegación completa de cliente) sin relación
 * directa entre ambos. Sin datos personales.
 */

const STORAGE_KEY = 'greener:analytics:navigation-source'

// Una atribución más vieja que esto se descarta: evita que una pestaña
// dejada abierta con un clic antiguo sin consumir contamine una visita
// muy posterior.
const MAX_AGE_MS = 30 * 60 * 1000

type StoredNavigationSource = {
  destinationPath: string
  section: string
  createdAt: number
}

function normalizePath(value: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return new URL(value, window.location.origin).pathname
  } catch {
    return null
  }
}

export function rememberNavigationSource(
  destination: string,
  section: string,
): void {
  if (typeof window === 'undefined') {
    return
  }

  const destinationPath = normalizePath(destination)
  const normalizedSection = section.trim()

  if (!destinationPath || !normalizedSection) {
    return
  }

  const value: StoredNavigationSource = {
    destinationPath,
    section: normalizedSection,
    createdAt: Date.now(),
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // sessionStorage puede estar deshabilitado (navegación privada
    // estricta) — la navegación debe seguir funcionando igualmente,
    // simplemente sin atribución.
  }
}

/**
 * Siempre consume (borra) el registro, exista o no, para que una
 * atribución ya leída nunca se reutilice en una visita posterior.
 */
export function consumeNavigationSource(): string {
  if (typeof window === 'undefined') {
    return 'direct'
  }

  let raw: string | null = null

  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY)
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    return 'direct'
  }

  if (!raw) {
    return 'direct'
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredNavigationSource>

    if (
      typeof parsed.destinationPath !== 'string' ||
      typeof parsed.section !== 'string' ||
      typeof parsed.createdAt !== 'number'
    ) {
      return 'direct'
    }

    if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
      return 'direct'
    }

    if (parsed.destinationPath !== window.location.pathname) {
      return 'direct'
    }

    return parsed.section.trim() || 'direct'
  } catch {
    return 'direct'
  }
}
