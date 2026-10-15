import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Un insight no tiene ficha: su contenido real es el paquete HTML de
 * `/insights/[slug]/app` (como el pin del feed, que ya salta directo). Esta
 * URL se conserva solo para los enlaces antiguos o escritos a mano y
 * redirige allí. No consulta la base de datos: si el insight no existe, o no
 * está publicado, el 404 lo da `/app`.
 *
 * Redirección temporal (307) a propósito: el insight puede despublicarse y
 * una redirección permanente quedaría en la caché de los navegadores.
 */
export default async function InsightPage({ params }: Props) {
  const { slug } = await params

  redirect(`/insights/${slug}/app`)
}
