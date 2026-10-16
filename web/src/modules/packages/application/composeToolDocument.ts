import * as cheerio from 'cheerio'
import { navItems, socialItems } from '@/components/shell/Shell/navItems'
import type { ResolvedPackage } from '@/modules/packages/domain/manifest'
import {
  escapeHtml,
  PACKAGE_HEAD_OVERRIDDEN_SELECTORS,
  pageTitle,
  renderMetadataHead,
} from './renderPackageHead'

export interface Viewport {
  width: number | string
  height: number | string
  sidebarWidth: number
}

/**
 * Menú lateral REAL de Greener, pintado en HTML y CSS planos porque esta
 * página no es una ruta React del sitio: es un documento HTML autónomo
 * compuesto a mano con cheerio (arquitectura §12.1, sin iframe). No puede
 * importar el componente ni su CSS Module, pero SÍ los datos: las entradas
 * salen de `navItems.ts`, la misma lista que usa el Shell, de modo que
 * añadir, quitar o renombrar una entrada (incluida «Privacy & Cookies», que
 * lleva a la página `/privacy` del sitio) cambia a la vez el sitio y los
 * documentos de tools e insights. Solo se repiten los estilos (SHELL_STYLES).
 */
type NavItem = {
  href: string
  label: string
  icon: string
}

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
  const navLinks = navItems.map(renderIconLink).join('')
  const socialLinks = socialItems.map(renderIconLink).join('')

  return (
    '<nav class="greener-sidebar" aria-label="Main navigation">' +
    '<a class="greener-logo" href="/" aria-label="Greener"><img src="/icons/logo_greener.svg" alt="" /></a>' +
    `<ul class="greener-nav-group">${navLinks}</ul>` +
    `<ul class="greener-social-group">${socialLinks}</ul>` +
    '</nav>'
  )
}

/**
 * Runtime de analítica de los paquetes: un script estático
 * (`public/greener-package-analytics.js`) que escucha el evento
 * `greener:tool-used` (o `window.GreenerAnalytics.toolUsed(action)`) que la
 * PROPIA tool dispara tras una interacción real, y lo reenvía a
 * `POST /api/analytics/package` (mismo origen, permitido por la CSP de esta
 * ruta). Esa ruta resuelve el slug al UUID real de `content` y lo manda a
 * Plausible como «Tool Used», con el mismo toolId que «Tool Open» (cruzables
 * en el dashboard).
 *
 * Se inyecta en Tools y en Insights (no en las páginas satélite, `variety`),
 * con `data-greener-kind` para que el
 * script sepa qué hacer: en una Tool queda a la escucha de «Tool Used»
 * (ÚNICO mecanismo, PROGRESO §2.17-§2.18); en un Insight registra UNA vez,
 * al cargar, «Insight Open» (no tiene ficha React donde dispararlo desde el
 * cliente: su URL pública es este mismo documento).
 */
function renderPackageAnalyticsRuntime(pkg: ResolvedPackage): string {
  // Una página satélite (`variety`) no tiene evento propio en el paquete: se
  // mide con «Pin Click» desde el feed. No se inyecta nada.
  if (pkg.manifest.kind === 'variety') return ''

  return `<script src="/greener-package-analytics.js" data-greener-kind="${pkg.manifest.kind}" data-greener-slug="${pkg.slug}"></script>`
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
 *
 * `siteUrl` (sin barra final) y `basePath` (con barra inicial y final) dan las
 * URLs ABSOLUTAS de las etiquetas Open Graph / canonical. Si el manifest
 * trae `metadata`, Greener emite esas etiquetas y descarta las que el HTML
 * del paquete tuviera por su cuenta (título, descripción, og:*, twitter:*,
 * canonical, theme-color, keywords y JSON-LD) para no duplicarlas. Una
 * versión publicada antes de existir `metadata` se sirve como siempre.
 */
export function composeToolDocument(
  pkg: ResolvedPackage,
  viewport: Viewport,
  basePath: string,
  siteUrl: string,
): string {
  const $ = cheerio.load(pkg.html)
  const metadata = pkg.manifest.metadata

  if (metadata) {
    $('head').find(PACKAGE_HEAD_OVERRIDDEN_SELECTORS).remove()
  }

  const headChildren = $('head').html() ?? ''
  const metadataHead = metadata
    ? renderMetadataHead(
        pkg.manifest,
        metadata,
        `${siteUrl}${basePath.replace(/\/$/, '')}`,
        `${siteUrl}${basePath}`,
      )
    : ''
  const bodyChildren = $('body').html() ?? ''
  const analyticsRuntime = renderPackageAnalyticsRuntime(pkg)

  const cssVars = [
    `--greener-available-width: ${toCssLength(viewport.width)}`,
    `--greener-available-height: ${toCssLength(viewport.height)}`,
    `--greener-sidebar-width: ${viewport.sidebarWidth}px`,
  ].join('; ')

  return `<!doctype html>
<html lang="${escapeHtml(metadata?.language ?? 'en')}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageTitle(metadata, pkg.slug))}</title>
    ${metadataHead}
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
