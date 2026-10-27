/**
 * Valor de una cookie del navegador por su nombre, o `null` si no existe, si
 * no hay `document` (render en servidor) o si el navegador bloquea las
 * cookies. El valor se devuelve tal cual, sin decodificar, y puede contener
 * `=`.
 */
export function readBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null

  try {
    const prefix = `${name}=`
    const entry = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix))

    return entry ? entry.slice(prefix.length) : null
  } catch {
    return null
  }
}
