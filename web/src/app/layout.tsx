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
  description: 'Greener — visual discovery, cases, insights and tools.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // CSP con script-src nonce + 'strict-dynamic' (src/proxy.ts,
  // src/lib/securityHeaders.ts): leer headers() aquí es la señal que hace que
  // Next renderice por petición en vez de en build (estático, sin nonce real
  // posible), y así aplica el nonce de cada petición a sus scripts de
  // hidratación. El valor no se usa en ningún sitio propio: basta con leerlo.
  // Es el coste asumido de que toda la web sea dinámica (auditoría E2),
  // compensado con las cachés de datos.
  await headers()

  return (
    <html lang="en" className={`${helveticaNeue.variable} ${kinder.variable}`}>
      <body>{children}</body>
    </html>
  )
}
