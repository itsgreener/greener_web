import { redirect } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Una página satélite (`other` de tipo page) no tiene ficha: su contenido
 * real es el paquete HTML de `/variety/[slug]/app`, igual que el pin del feed.
 * Esta URL se conserva solo para enlaces escritos a mano y redirige allí. No
 * consulta la base de datos: si el contenido no existe, no está publicado o
 * es una newsletter (que no tiene paquete ni página), el 404 lo da `/app`.
 *
 * Redirección temporal (307) a propósito: la página puede despublicarse y una
 * redirección permanente quedaría en la caché de los navegadores.
 */
export default async function VarietyPage({ params }: Props) {
  const { slug } = await params

  redirect(`/variety/${slug}/app`)
}
