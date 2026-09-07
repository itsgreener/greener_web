import * as cheerio from 'cheerio'
import type { ResolvedPackage } from '../domain/manifest'

export interface Viewport {
  width: number
  height: number
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

const SHELL_STYLES = `
  html, body { margin: 0; padding: 0; }
  .greener-shell { display: grid; grid-template-columns: var(--greener-sidebar-width) 1fr; min-height: 100dvh; }
  .greener-sidebar { border-right: 1px solid #e5e5e5; padding: 16px 0; }
  .greener-sidebar ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .greener-sidebar a { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; color: #111; text-decoration: none; font-family: system-ui, sans-serif; }
  .greener-sidebar a:hover { background: #f4f4f4; }
  .greener-package-content { min-width: 0; }
`

/**
 * Compone en un único documento HTML real: el menú lateral de iconos
 * (siempre visible, brief §6) + el contenido del paquete de la tool/insight,
 * extraído de su propio <head>/<body> y reinsertado tal cual — sin iframe,
 * sin re-anidar <html> (arquitectura §12.1, §12.4).
 *
 * Al ser la respuesta HTML inicial de la ruta (no una inyección vía
 * innerHTML en el cliente), los <script> del paquete se ejecutan de forma
 * nativa al parsear el documento, evitando el problema clásico de scripts
 * que no se ejecutan al inyectarse dinámicamente.
 */
export function composeToolDocument(
  pkg: ResolvedPackage,
  viewport: Viewport,
  basePath: string,
): string {
  const $ = cheerio.load(pkg.html)

  const headChildren = $('head').html() ?? ''
  const bodyChildren = $('body').html() ?? ''

  const cssVars = `--greener-available-width: ${viewport.width}px; --greener-available-height: ${viewport.height}px; --greener-sidebar-width: ${viewport.sidebarWidth}px;`

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pkg.slug} · Greener</title>
    <!-- Fuerza que TODAS las rutas relativas del paquete (CSS, JS, y el
         Worker() invocado desde dentro de main.js, que resuelve contra
         document.baseURI) apunten a su propia carpeta, sin depender de si
         la URL visitada lleva barra final (arquitectura §12.2). -->
    <base href="${basePath}" />
    <style>:root { ${cssVars} } ${SHELL_STYLES}</style>
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
