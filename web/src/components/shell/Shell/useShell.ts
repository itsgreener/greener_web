/**
 * Entradas del menú lateral. No existe entrada "Casos": es deliberado,
 * los casos son el 70% de la home y no necesitan sección propia (brief §6).
 */
const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/insights', label: 'Insights' },
  { href: '/tools', label: 'Tools' },
  { href: '/channel', label: 'Channel' },
  { href: '/contact', label: 'Contacto' },
] as const

export function useShell() {
  return { navItems: NAV_ITEMS }
}
