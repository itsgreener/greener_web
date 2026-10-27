'use client'

import {
  ERROR_COPY,
  type ErrorBoundaryProps,
} from '@/components/status/ErrorPage/copy'
import { StatusPage } from '@/components/status/StatusPage'
import './globals.css'

// Último recurso: falla el propio layout raíz. Al sustituirlo, tiene que
// pintar su propio <html> y <body>, y volver a importar los estilos
// globales (el layout que los cargaba es justo el que ha fallado). Sin
// next/link ni nada que dependa del router: enlace y botón planos.
export default function GlobalError({ reset }: ErrorBoundaryProps) {
  return (
    <html lang="en">
      <body>
        <main>
          <StatusPage title={ERROR_COPY.title} message={ERROR_COPY.message}>
            <button type="button" onClick={reset}>
              {ERROR_COPY.retry}
            </button>
            {/* <a> plano a propósito: aquí ha fallado el layout raíz y el
                router puede no estar disponible; una recarga completa es
                justo lo que se quiere para recuperarse. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">{ERROR_COPY.home}</a>
          </StatusPage>
        </main>
      </body>
    </html>
  )
}
