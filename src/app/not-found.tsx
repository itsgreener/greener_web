import { NotFoundPage } from '@/components/status/NotFoundPage'

// URLs que no coinciden con ninguna ruta. Va sin Shell (el Shell vive en
// (public)/layout.tsx); los notFound() lanzados desde las páginas públicas
// los recoge (public)/not-found.tsx, que sí mantiene el menú lateral.
export default function NotFound() {
  return (
    <main>
      <NotFoundPage />
    </main>
  )
}
