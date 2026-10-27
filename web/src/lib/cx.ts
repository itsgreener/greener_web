/**
 * Une nombres de clase descartando los vacíos (`cx(styles.a, activo && styles.b)`).
 * Lo usan el ABM y la web pública; evita la cadena con espacio final que deja
 * una plantilla de texto cuando la condición es falsa.
 */
export function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}
