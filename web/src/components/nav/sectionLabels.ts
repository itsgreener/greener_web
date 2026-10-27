/**
 * Nombre de cada sección en la navegación. Lo comparten el menú lateral del
 * Shell (`components/shell/Shell/navItems.ts`) y el menú auxiliar de la home
 * (`components/nav/AuxNav`): los destinos son distintos a propósito (el lateral
 * lleva «We did it» a `/`, el auxiliar a `/work`), pero el nombre es el mismo.
 * Labels en inglés (arquitectura §2.4: «interfaz global en inglés»).
 */
export const SECTION_LABELS = {
  work: 'We did it',
  channel: 'Podcasts',
  insights: 'Insights',
  tools: 'Tools',
} as const
