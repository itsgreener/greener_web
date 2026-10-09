import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { env } from '@/lib/env'
import { helveticaNeue, kinder } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  // Dominio público: sin esto, Next no sabe contra qué resolver las URLs
  // relativas de metadata (hreflang de /work/[slug], og:image relativas...)
  // y en producción saldrían contra localhost. Sale de NEXT_PUBLIC_SITE_URL,
  // ya normalizada sin barra final (src/lib/env.ts).
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  // Favicon: sin él el navegador pide /favicon.ico en cada visita y recibe
  // un 404. El logo ya vive en /public/icons.
  icons: { icon: '/icons/logo_greener.svg' },
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
    <html lang="en" className={`${helveticaNeue.variable} ${kinder.variable}`}>
      <body>{children}</body>
    </html>
  )
}
