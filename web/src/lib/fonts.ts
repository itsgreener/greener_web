import localFont from 'next/font/local'

/**
 * Tipografías del sitio (2 oct 2026). Se autoalojan con `next/font/local`:
 * Next las sirve desde el propio dominio con URL con hash e `immutable`,
 * precarga las de uso global y genera una tipografía de respaldo con las
 * métricas ajustadas para evitar saltos de maquetación (CLS, §18.3).
 * La CSP ya permite `font-src 'self'` (securityHeaders.ts).
 *
 * Los ficheros de `src/fonts/` son WOFF2 derivados de los OTF originales
 * (ver src/fonts/README.md). Esto solo declara las fuentes y expone sus
 * variables CSS; las variables que usa el resto del CSS (`--font-body`,
 * `--font-display`) y las clases de texto viven en `app/globals.css`.
 */

/**
 * Helvetica Neue — texto general del sitio. Solo Regular (400) y Bold
 * (700): el CSS público usa los pesos 400, 600 y 700, y el 600 se resuelve
 * solo al Bold (no hay semibold; el navegador elige el siguiente peso más
 * pesado). Sin cursivas: el proyecto no usa `font-style: italic`.
 */
export const helveticaNeue = localFont({
  src: [
    {
      path: '../fonts/helvetica-neue-400.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/helvetica-neue-700.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-helvetica-neue',
  display: 'swap',
})

/**
 * Kinder — tipografía de display, de uso muy puntual (hoy: título de las
 * fichas de caso y de la página de contacto, clase global `.text-display`).
 * Solo existe en Regular: la clase fuerza `font-weight: 400` para que el
 * navegador no fabrique una negrita falsa. `preload: false` para que la
 * home no pague una descarga que solo necesitan esas páginas; el navegador
 * la pide cuando aparece un texto que la usa.
 */
export const kinder = localFont({
  src: [
    {
      path: '../fonts/kinder-400.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-kinder',
  display: 'swap',
  preload: false,
})
