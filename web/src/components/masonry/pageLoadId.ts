/**
 * Arquitectura §6.1: "Cada carga completa del documento crea un
 * pageLoadId". Constante de módulo, no estado de React — un módulo se
 * evalúa una sola vez por carga real del documento (recarga completa =
 * el navegador vuelve a ejecutar todo el JS desde cero = nuevo id); una
 * navegación interna de Next.js (cliente, sin recargar el documento)
 * jamás vuelve a evaluar este módulo, así que el id se mantiene estable
 * mientras se navegue dentro de la SPA — justo la diferencia que pide la
 * arquitectura ("sessionStorage por sí solo no cumple sobrevive a la
 * navegación y muere en reload, porque también sobrevive a una
 * recarga").
 */
export const pageLoadId =
  typeof window === 'undefined' ? '' : crypto.randomUUID()
