import * as cheerio from 'cheerio'
import type { ResolvedPackage } from '../domain/manifest'

export interface Viewport {
  width: number | string
  height: number | string
  sidebarWidth: number
}

/**
 * Menú lateral REAL de Greener (components/shell/Shell), replicado en HTML
 * y CSS planos porque esta página no es una ruta React del sitio: es un
 * documento HTML autónomo compuesto a mano con cheerio (arquitectura
 * §12.1, sin iframe). No puede importar el componente ni su CSS Module.
 *
 * Corregido el 29 de septiembre (PROGRESO §4.8): hasta entonces era una
 * mini-nav aparte, con solo 5 enlaces por inicial (sin iconos reales),
 * "Contacto" en español y `lang="es"` fijo — visualmente distinta del
 * resto del sitio en cada página de tool e insight. Mantener dos
 * implementaciones del mismo menú es el riesgo real: si el Shell cambia
 * (useShell.ts) y esta copia no se actualiza, vuelven a divergir. No hay
 * forma de evitarlo del todo sin unificar el mecanismo de composición
 * (fuera de alcance aquí) — mientras tanto, ambas listas de items viven
 * una junto a la otra con la MISMA estructura que useShell.ts, para que
 * revisarlas en paralelo sea fácil.
 */
type NavItem = {
  href: string
  label: string
  icon: string
}

// Mismos labels, iconos y orden que useShell.ts NAV_ITEMS (los cuatro con
// visible: true — Shop queda fuera de alcance de V1). Inglés: arquitectura
// §2.4, "interfaz global en inglés".
const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'We did it', icon: 'works' },
  { href: '/channel', label: 'Podcasts', icon: 'episodes' },
  { href: '/insights', label: 'Insights', icon: 'insights' },
  { href: '/tools', label: 'Tools', icon: 'tools' },
]

// Mismos labels, iconos y orden que useShell.ts SOCIAL_ITEMS.
const SOCIAL_ITEMS: (NavItem & { external: boolean })[] = [
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
  {
    href: '/privacy',
    label: 'Privacy & Cookies',
    icon: 'privacy',
    external: false,
  },
]

function renderIconLink(item: NavItem & { external?: boolean }): string {
  // href absoluto (empieza por "/" o "https://"): el <base href> de más
  // abajo solo reescribe referencias relativas, así que estos enlaces
  // siguen apuntando al sitio real, no a la propia carpeta del paquete.
  const relAttrs = item.external
    ? ' target="_blank" rel="noopener noreferrer"'
    : ''

  return (
    `<li><a class="greener-icon-link" href="${item.href}" aria-label="${item.label}"${relAttrs}>` +
    `<span class="greener-icon" style="--icon-url: url(/icons/${item.icon}.svg)" aria-hidden="true"></span>` +
    `<span class="greener-tooltip" aria-hidden="true">${item.label}</span>` +
    `</a></li>`
  )
}

function renderSidebar(): string {
  const navItems = NAV_ITEMS.map(renderIconLink).join('')
  const socialItems = SOCIAL_ITEMS.map(renderIconLink).join('')

  return (
    '<nav class="greener-sidebar" aria-label="Navegación principal">' +
    '<a class="greener-logo" href="/" aria-label="Greener"><img src="/icons/logo_greener.svg" alt="" /></a>' +
    `<ul class="greener-nav-group">${navItems}</ul>` +
    `<ul class="greener-social-group">${socialItems}</ul>` +
    '</nav>'
  )
}

/**
 * Runtime de analítica de los paquetes (29 sep, integrado desde otra rama
 * de trabajo — ver PROGRESO §2.17): un script estático
 * (`public/greener-package-analytics.js`) que escucha el evento
 * `greener:tool-used` (o `window.GreenerAnalytics.toolUsed(action)`) que
 * la PROPIA tool puede disparar tras una interacción real, y lo reenvía
 * a `POST /api/analytics/package` (mismo origen, permitido por la CSP de
 * esta ruta) — que resuelve el slug al UUID real de `content` antes de
 * mandarlo a Plausible como "Tool Used", con el mismo toolId que usa
 * "Tool Open" (cruzables entre sí en el dashboard de Plausible).
 *
 * Solo en Tools, nunca en Insights: aparcado explícitamente para
 * Insights (29 sep, conversación con el usuario).
 *
 * Es el ÚNICO mecanismo para "Tool Used": existió brevemente un segundo
 * mecanismo (servidor, automático al entrar en la ruta, sin pasar por la
 * propia tool — `serverAnalytics.ts`), retirado el mismo día porque el
 * usuario prefirió quedarse con este, precisamente por poder cruzarlo con
 * "Tool Open" (PROGRESO §2.17-§2.18).
 */
function renderPackageAnalyticsRuntime(pkg: ResolvedPackage): string {
  if (pkg.manifest.kind !== 'tool') {
    return ''
  }

  return `<script src="/greener-package-analytics.js" data-greener-tool-slug="${pkg.slug}"></script>`
}

function toCssLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

// Valores reales de app/globals.css (--sidebar-width, --space-*,
// --color-*): esta página no carga esa hoja de estilos (documento HTML
// autónomo, sin las rutas /_next/static del bundle del sitio), así que
// se copian los valores, no las variables — no hay una única fuente de
// verdad posible aquí sin cambiar cómo se sirve esta ruta.
const SHELL_STYLES = `
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
    color: #111111;
  }

  .greener-shell {
    display: grid;
    grid-template-columns: var(--greener-sidebar-width) minmax(0, 1fr);
    width: 100%;
    height: 100dvh;
  }

  .greener-sidebar {
    position: sticky;
    top: 0;
    z-index: 10;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    border-right: 1px solid #e5e5e5;
    padding: 16px 0;
  }

  .greener-logo {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .greener-logo img {
    width: 20px;
    height: auto;
  }

  .greener-nav-group,
  .greener-social-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .greener-social-group {
    margin-top: auto;
  }

  .greener-icon-link {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    color: #111111;
    text-decoration: none;
  }

  .greener-icon-link:hover,
  .greener-icon-link:focus-visible {
    background: #f4f4f4;
  }

  .greener-icon {
    width: 20px;
    height: 20px;
    background-color: currentColor;
    mask-image: var(--icon-url);
    mask-repeat: no-repeat;
    mask-position: center;
    mask-size: contain;
    -webkit-mask-image: var(--icon-url);
    -webkit-mask-repeat: no-repeat;
    -webkit-mask-position: center;
    -webkit-mask-size: contain;
    transition: transform 0.15s ease, color 0.15s ease;
  }

  .greener-icon-link:hover .greener-icon,
  .greener-icon-link:focus-visible .greener-icon {
    transform: scale(1.15);
    color: #1941f5;
  }

  .greener-tooltip {
    position: absolute;
    left: calc(100% + 8px);
    top: 50%;
    transform: translateY(-50%) translateX(-4px);
    white-space: nowrap;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    background: #111111;
    color: #ffffff;
    font-size: 0.75rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .greener-icon-link:hover .greener-tooltip,
  .greener-icon-link:focus-visible .greener-tooltip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  .greener-package-content {
    min-width: 0;
    width: var(--greener-available-width);
    min-height: var(--greener-available-height);
  }
`

/**
 * Compone en un único documento HTML real: el menú lateral de iconos
 * (siempre visible, brief §6) + el contenido del paquete de la tool/insight,
 * extraído de su propio <head>/<body> y reinsertado tal cual — sin iframe,
 * sin re-anidar <html> (arquitectura §12.1, §12.4).
 *
 * El espacio disponible se comunica mediante variables CSS:
 * --greener-available-width
 * --greener-available-height
 * --greener-sidebar-width
 *
 * width y height pueden ser números (útil para tests) o expresiones CSS
 * dinámicas como calc(100dvw - 64px) y 100dvh.
 */
export function composeToolDocument(
  pkg: ResolvedPackage,
  viewport: Viewport,
  basePath: string,
): string {
  const $ = cheerio.load(pkg.html)

  const headChildren = $('head').html() ?? ''
  const bodyChildren = $('body').html() ?? ''
  const analyticsRuntime = renderPackageAnalyticsRuntime(pkg)

  const cssVars = [
    `--greener-available-width: ${toCssLength(viewport.width)}`,
    `--greener-available-height: ${toCssLength(viewport.height)}`,
    `--greener-sidebar-width: ${viewport.sidebarWidth}px`,
  ].join('; ')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pkg.slug} · Greener</title>
    <!-- Fuerza que TODAS las rutas relativas del paquete (CSS, JS, y el
         Worker() invocado desde dentro de main.js, que resuelve contra
         document.baseURI) apunten a su propia carpeta. -->
    <base href="${basePath}" />
    <style>:root { ${cssVars}; } ${SHELL_STYLES}</style>
    ${headChildren}
    ${analyticsRuntime}
  </head>
  <body>
    <div class="greener-shell">
      ${renderSidebar()}
      <main class="greener-package-content">
        ${bodyChildren}
      </main>
    </div>
  </body>
</html>`
}
