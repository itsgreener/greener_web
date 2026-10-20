import { notFound, redirect } from 'next/navigation'

import { publishedPackages } from '@/modules/packages/container'

type Props = {
  params: Promise<{ slug: string }>
}

// Depende de qué páginas satélite estén publicadas en cada momento.
export const dynamic = 'force-dynamic'

/**
 * URL corta de una página satélite: `/{slug}` lleva a `/variety/{slug}/app`.
 * Vale para cualquier página que se publique bajo `variety`, sin tocar código.
 *
 * - Solo redirige si el slug es de una página satélite **publicada** con
 *   versión publicada; cualquier otra URL da el 404 de siempre. La lista de
 *   slugs sale de una única consulta cacheada 60 s (se invalida al
 *   publicar/despublicar desde el ABM), así que una URL inventada no consulta
 *   la base de datos.
 * - Las rutas estáticas (`/contact`, `/privacy`, `/tools`…) ganan siempre a
 *   esta dinámica: por eso el alta de una página rechaza esos slugs
 *   (`reservedSlugs.ts`).
 * - 307 (temporal) a propósito, como en `/variety/{slug}`: la página puede
 *   despublicarse y un 301 se quedaría en la caché del navegador.
 * - El fragmento (`#/form/<token>` en el enlace del correo de talent) no
 *   viaja al servidor pero sobrevive a la redirección: si la respuesta no
 *   trae fragmento, el navegador conserva el de la URL original. La
 *   cadena de consulta (`?utm_…`) no se arrastra.
 */
export default async function ShortVarietyPage({ params }: Props) {
  const { slug } = await params

  const published = await publishedPackages.listPublishedSlugs('variety')

  if (!published.includes(slug)) {
    notFound()
  }

  redirect(`/variety/${slug}/app`)
}
