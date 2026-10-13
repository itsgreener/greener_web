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
 * Vive en una variable de módulo (memoria de la pestaña), NO en
 * sessionStorage ni en ninguna otra forma de almacenamiento del navegador:
 * la navegación entre páginas de la web es de cliente (el módulo sigue vivo),
 * y una recarga completa solo hace que la visita cuente como "direct". Así
 * este dato nunca toca el dispositivo del visitante y no entra en la política
 * de cookies (ventana de cookies, 13 oct 2026). Sin datos personales.
 */

// Una atribución más vieja que esto se descarta: evita que una pestaña
// dejada abierta con un clic antiguo sin consumir contamine una visita
// muy posterior.
const MAX_AGE_MS = 30 * 60 * 1000

type PendingNavigationSource = {
  destinationPath: string
  section: string
  createdAt: number
}

let pending: PendingNavigationSource | null = null

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

  pending = {
    destinationPath,
    section: normalizedSection,
    createdAt: Date.now(),
  }
}

/**
 * Siempre consume (borra) el registro, exista o no, para que una
 * atribución ya leída nunca se reutilice en una visita posterior.
 */
export function consumeNavigationSource(): string {
  const value = pending
  pending = null

  if (typeof window === 'undefined' || !value) {
    return 'direct'
  }

  if (Date.now() - value.createdAt > MAX_AGE_MS) {
    return 'direct'
  }

  if (value.destinationPath !== window.location.pathname) {
    return 'direct'
  }

  return value.section || 'direct'
}
