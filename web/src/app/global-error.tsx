'use client'

import { StatusPage } from '@/components/status/StatusPage'
import './globals.css'

// Último recurso: falla el propio layout raíz. Al sustituirlo, tiene que
// pintar su propio <html> y <body>, y volver a importar los estilos
// globales (el layout que los cargaba es justo el que ha fallado). Sin
// next/link ni nada que dependa del router: enlace y botón planos.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <main>
          <StatusPage
            title="Something went wrong"
            message="An unexpected error occurred. You can try again or head back to the home page."
          >
            <button type="button" onClick={reset}>
              Try again
            </button>
            {/* <a> plano a propósito: aquí ha fallado el layout raíz y el
                router puede no estar disponible; una recarga completa es
                justo lo que se quiere para recuperarse. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Back to home</a>
          </StatusPage>
        </main>
      </body>
    </html>
  )
}
