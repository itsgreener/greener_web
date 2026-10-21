/** Une nombres de clase descartando los vacíos (`cx(styles.a, activo && styles.b)`). */
export function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}
