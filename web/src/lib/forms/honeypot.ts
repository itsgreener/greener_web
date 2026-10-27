/**
 * Lee el campo señuelo de un formulario. Devuelve siempre un string: vacío si
 * el campo no viene (o viene como archivo), que es el caso de una persona
 * real. Lo que llegue relleno lo evalúa el caso de uso.
 */
export function readHoneypot(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}
