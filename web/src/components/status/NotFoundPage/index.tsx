import Link from 'next/link'
import { StatusPage } from '@/components/status/StatusPage'

/** Cuerpo del 404 — lo comparten el not-found de la raíz y el de (public). */
export function NotFoundPage() {
  return (
    <StatusPage
      title="Page not found"
      message="The page you are looking for doesn't exist or is no longer available."
    >
      <Link href="/">Back to home</Link>
    </StatusPage>
  )
}
