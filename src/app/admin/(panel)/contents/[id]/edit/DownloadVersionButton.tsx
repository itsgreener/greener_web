'use client'

import { useState } from 'react'

import { AdminButton } from '@/components/admin/AdminButton'
import { AdminMessage } from '@/components/admin/AdminMessage'

type Props = {
  contentId: string
  versionId: string
  /** Número de la versión (`3`), solo para el nombre de reserva del fichero. */
  version: number
}

const GENERIC_ERROR = 'No se ha podido descargar el ZIP.'

/** El nombre que manda la ruta en `Content-Disposition`, o uno de reserva. */
function fileNameOf(header: string | null, fallback: string): string {
  const match = header ? /filename="([^"]+)"/.exec(header) : null

  return match?.[1] ?? fallback
}

/**
 * Botón «Descargar» de una versión del paquete. Pide el ZIP con `fetch` en vez
 * de navegar al enlace: si la ruta responde con un error (sesión caducada,
 * versión que ya no existe, ZIP demasiado grande) el admin lo lee aquí y no
 * pierde la página ni se descarga un `.json` suelto.
 */
export default function DownloadVersionButton({
  contentId,
  versionId,
  version,
}: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (pending) return

    setPending(true)
    setError(null)

    try {
      const query = new URLSearchParams({
        content: contentId,
        version: versionId,
      })
      const response = await fetch(`/api/admin/packages/download?${query}`, {
        credentials: 'same-origin',
      })

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)
        const message =
          typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          typeof body.error === 'string'
            ? body.error
            : GENERIC_ERROR

        setError(message)
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = fileNameOf(
        response.headers.get('Content-Disposition'),
        `paquete-v${version}.zip`,
      )
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (caught) {
      console.error('Admin · descarga del paquete:', caught)
      setError(GENERIC_ERROR)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <AdminButton
        type="button"
        compact
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? 'Preparando…' : 'Descargar ZIP'}
      </AdminButton>

      {error && (
        <AdminMessage kind="error" role="alert">
          {error}
        </AdminMessage>
      )}
    </>
  )
}
