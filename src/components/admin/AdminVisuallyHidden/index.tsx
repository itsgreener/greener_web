/**
 * Texto solo para lectores de pantalla (etiquetas de búsqueda, columnas de
 * acciones). Usa la clase global `visually-hidden` de globals.css.
 */
export function AdminVisuallyHidden({
  children,
}: {
  children: React.ReactNode
}) {
  return <span className="visually-hidden">{children}</span>
}
