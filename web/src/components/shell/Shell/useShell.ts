/**
 * Entradas del menú lateral, en los tres bloques que confirmó diseño el
 * 14 sep (logo / navegación / redes — ver la captura de referencia).
 * No existe entrada "Casos" en el bloque de navegación: es deliberado,
 * los casos son el 70% de la home y no necesitan sección propia (brief
 * §6) — el icono "works" apunta a la home por el mismo motivo.
 *
 * Labels en inglés (arquitectura §2.4: "interfaz global en inglés") —
 * alineados el 15 sep con los del menú auxiliar de la home
 * (components/nav/AuxNav), que fue el primer sitio donde se confirmaron
 * los nombres reales de cada sección.
 *
 * "shop" viene en el set de iconos porque así será el diseño final, pero
 * Shop está fuera de alcance de V1 (arquitectura §2.2, §2.3: "el menú V1
 * no mostrará Shop") — por eso `visible: false` en vez de no declararlo:
 * cuando haya funcionalidad real detrás, activarlo es una sola línea.
 */
const NAV_ITEMS = [
  { href: '/', label: 'We did it', icon: 'works', visible: true },
  { href: '/channel', label: 'Podcasts', icon: 'episodes', visible: true },
  { href: '/insights', label: 'Insights', icon: 'insights', visible: true },
  { href: '/tools', label: 'Tools', icon: 'tools', visible: true },
  { href: '/shop', label: 'Shop', icon: 'shop', visible: false },
] as const

/**
 * "contact" no es un enlace externo: es el hueco reservado a Contacto
 * (brief §5.6, arquitectura §14.1), todavía sin construir del todo —
 * hoy sirve un placeholder en /contact.
 *
 * instagram/youtube/linkedin: URLs reales confirmadas el 15 sep.
 * tiktok y whatsapp no se incluyen: Greener confirmó que no se van a
 * usar esos enlaces.
 */
const SOCIAL_ITEMS = [
  { href: '/contact', label: 'Contact', icon: 'contact', external: false },
  {
    href: 'https://www.instagram.com/itsgreenerhere/',
    label: 'Instagram',
    icon: 'instagram',
    external: true,
  },
  {
    href: 'https://www.youtube.com/@Itsgreenernow',
    label: 'YouTube',
    icon: 'youtube',
    external: true,
  },
  {
    href: 'https://www.linkedin.com/company/greener/posts/',
    label: 'LinkedIn',
    icon: 'linkedin',
    external: true,
  },
  // Política de privacidad y cookies (28 sep, decisión de cookies): la guía
  // de la AEPD pide que la información sea de acceso fácil y permanente, a
  // no más de dos clics desde cualquier página. Un pie de página no sirve
  // aquí: el feed de la home es infinito y nunca se llegaría a él. El
  // menú lateral, en cambio, está siempre a la vista.
  {
    href: '/privacy',
    label: 'Privacy & Cookies',
    icon: 'privacy',
    external: false,
  },
] as const

export function useShell() {
  return {
    navItems: NAV_ITEMS.filter((item) => item.visible),
    socialItems: SOCIAL_ITEMS,
  }
}
