/**
 * Entradas del menú lateral, en tres bloques (logo / navegación / redes).
 * No existe entrada "Casos" en el bloque de navegación: es deliberado, los
 * casos son el 70% de la home y no necesitan sección propia (brief §6) — el
 * icono "works" apunta a la home por el mismo motivo.
 *
 * Labels en inglés (arquitectura §2.4: "interfaz global en inglés"), los
 * mismos que el menú auxiliar de la home (components/nav/AuxNav).
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
 * "contact" no es un enlace externo: lleva a /contact (formulario;
 * brief §5.6, arquitectura §14.1).
 *
 * tiktok y whatsapp no se incluyen: Greener no va a usar esos enlaces.
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
  // Política de privacidad y cookies (con la decisión de cookies al principio
  // de la página, ancla #cookie-choice): la guía
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

export const navItems = NAV_ITEMS.filter((item) => item.visible)

export const socialItems = SOCIAL_ITEMS
