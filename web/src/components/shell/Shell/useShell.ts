/**
 * Entradas del menú lateral, en los tres bloques que confirmó diseño el
 * 14 sep (logo / navegación / redes — ver la captura de referencia).
 * No existe entrada "Casos" en el bloque de navegación: es deliberado,
 * los casos son el 70% de la home y no necesitan sección propia (brief
 * §6) — el icono "works" apunta a la home por el mismo motivo.
 *
 * "shop" viene en el set de iconos porque así será el diseño final, pero
 * Shop está fuera de alcance de V1 (arquitectura §2.2, §2.3: "el menú V1
 * no mostrará Shop") — por eso `visible: false` en vez de no declararlo:
 * cuando haya funcionalidad real detrás, activarlo es una sola línea.
 */
const NAV_ITEMS = [
  { href: '/', label: 'Casos', icon: 'works', visible: true },
  { href: '/channel', label: 'Channel', icon: 'episodes', visible: true },
  { href: '/insights', label: 'Insights', icon: 'insights', visible: true },
  { href: '/tools', label: 'Tools', icon: 'tools', visible: true },
  { href: '/shop', label: 'Shop', icon: 'shop', visible: false },
] as const

/**
 * "contact" no es un enlace externo: es el hueco reservado a Contacto
 * (brief §5.6, arquitectura §14.1), todavía sin construir — por eso
 * apunta a una ruta interna, no a un mailto: ni una URL externa.
 *
 * instagram/youtube/linkedin: pendiente de que Greener confirme las
 * URLs reales — de momento enlazan a '#' para no publicar cuentas
 * incorrectas o inventadas. tiktok y whatsapp no se incluyen: Greener
 * confirmó el 14 sep que no se van a usar esos enlaces.
 */
const SOCIAL_ITEMS = [
  { href: '/contacto', label: 'Contacto', icon: 'contact', external: false },
  { href: '#', label: 'Instagram', icon: 'instagram', external: true },
  { href: '#', label: 'YouTube', icon: 'youtube', external: true },
  { href: '#', label: 'LinkedIn', icon: 'linkedin', external: true },
] as const

export function useShell() {
  return {
    navItems: NAV_ITEMS.filter((item) => item.visible),
    socialItems: SOCIAL_ITEMS,
  }
}
