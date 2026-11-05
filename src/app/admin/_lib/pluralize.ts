/** «1 contenido», «2 contenidos»: elige singular o plural según `count`. */
export function pluralize(
  count: number,
  singular: string,
  plural: string,
): string {
  return count === 1 ? singular : plural
}
