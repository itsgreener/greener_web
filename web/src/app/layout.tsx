import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Greener',
    template: '%s · Greener',
  },
  description:
    'Greener — descubrimiento visual, casos, insights y herramientas.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Decisión del 22 de septiembre (CSP con script-src nonce +
  // 'strict-dynamic', src/proxy.ts + src/lib/securityHeaders.ts): leer
  // headers() aquí es justo la señal que hace que Next.js deje de
  // generar esta rama en build (estático, sin nonce real posible) y la
  // renderice por request — solo así el nonce real de cada petición
  // llega a los propios scripts de hidratación que emite Next. No se
  // usa el valor en ningún sitio propio (no hay ningún <script> inline
  // escrito a mano en el proyecto) — basta con leerlo para que Next
  // aplique el suyo solo en cuanto ve la cabecera Content-Security-
  // Policy de la petición.
  await headers()

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
