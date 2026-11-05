import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { env } from '@/lib/env'
import { helveticaNeue, kinder } from '@/lib/fonts'
import { buildOpenGraph } from '@/lib/pageMetadata'
import './globals.css'

export const metadata: Metadata = {
  // Dominio público: sin esto, Next no sabe contra qué resolver las URLs
  // relativas de metadata (hreflang de /work/[slug], og:image relativas...)
  // y en producción saldrían contra localhost. Sale de NEXT_PUBLIC_SITE_URL,
  // ya normalizada sin barra final (src/lib/env.ts).
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  // Favicon: el SVG del logo para los navegadores que lo admiten, y
  // `src/app/favicon.ico` (lo añade Next solo) para el resto y para los
  // rastreadores que lo piden. El icono de iOS va declarado aquí a mano: con
  // `icons` definido, Next ignora el `apple-icon.png` de la convención de
  // ficheros (solo trata como caso especial el favicon). Vive en `public/` con
  // el nombre por defecto que iOS pide aunque no haya `<link>` (RES-C4).
  icons: {
    icon: '/icons/logo_greener.svg',
    apple: '/apple-touch-icon.png',
  },
  title: {
    default: 'Greener',
    template: '%s · Greener',
  },
  description: 'Greener — visual discovery, cases, insights and tools.',
  // Imagen para compartir por defecto (RES-C3). Las páginas que declaran su
  // propio `openGraph` (Next lo fusiona de forma superficial) vuelven a poner
  // esta misma imagen con `buildOpenGraph`; aquí cubre cualquier otra ruta.
  openGraph: buildOpenGraph({
    title: 'Greener',
    description: 'Greener — visual discovery, cases, insights and tools.',
  }),
  twitter: { card: 'summary_large_image' },
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
