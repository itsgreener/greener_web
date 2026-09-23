import * as cheerio from 'cheerio'
import type { ResolvedPackage } from '../domain/manifest'

export interface Viewport {
  width: number | string
  height: number | string
  sidebarWidth: number
}

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/insights', label: 'Insights' },
  { href: '/tools', label: 'Tools' },
  { href: '/channel', label: 'Channel' },
  { href: '/contact', label: 'Contacto' },
]

function renderSidebar(): string {
  const items = NAV_ITEMS.map(
    (item) =>
      `<li><a href="${item.href}" title="${item.label}" aria-label="${item.label}">${item.label[0]}</a></li>`,
  ).join('')

  return `<nav class="greener-sidebar" aria-label="Navegación principal"><ul>${items}</ul></nav>`
}

function toCssLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

const SHELL_STYLES = `
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100%;
  }

  .greener-shell {
    display: grid;
    grid-template-columns: var(--greener-sidebar-width) minmax(0, 1fr);
    width: 100%;
    min-height: 100dvh;
  }

  .greener-sidebar {
    border-right: 1px solid #e5e5e5;
    padding: 16px 0;
  }

  .greener-sidebar ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .greener-sidebar a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    color: #111;
    text-decoration: none;
    font-family: system-ui, sans-serif;
  }

  .greener-sidebar a:hover {
    background: #f4f4f4;
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

  const cssVars = [
    `--greener-available-width: ${toCssLength(viewport.width)}`,
    `--greener-available-height: ${toCssLength(viewport.height)}`,
    `--greener-sidebar-width: ${viewport.sidebarWidth}px`,
  ].join('; ')

  return `<!doctype html>
<html lang="es">
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
