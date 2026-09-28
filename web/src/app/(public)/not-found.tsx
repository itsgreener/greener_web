import { NotFoundPage } from '@/components/status/NotFoundPage'

// notFound() de las páginas públicas (contenido inexistente, despublicado o
// sin traducción): se pinta dentro del Shell, con el menú lateral.
export default function PublicNotFound() {
  return <NotFoundPage />
}
