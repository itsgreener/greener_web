/**
 * `sessionStorage` con guarda: puede lanzar en navegación privada estricta,
 * con el almacenamiento lleno o bloqueado por el navegador. En el ABM solo
 * guarda comodidades (la última selección de un listado), así que un fallo se
 * traga y la pantalla sigue funcionando sin ellas.
 */

export function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSession(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Sin almacenamiento: se pierde la comodidad, no la pantalla.
  }
}

export function removeSession(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Igual que en `writeSession`.
  }
}
