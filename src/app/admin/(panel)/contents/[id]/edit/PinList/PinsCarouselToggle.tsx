'use client'

import { useState, useTransition } from 'react'

import { AdminCheckbox } from '@/components/admin/AdminControls'
import { AdminHint } from '@/components/admin/AdminField'
import { AdminMessage } from '@/components/admin/AdminMessage'

import { setPinsCarouselAction } from '@/app/admin/(panel)/contents/[id]/edit/episodeActions'

import styles from './PinList.module.css'

/**
 * Casilla persistente del carrusel de pines de un episodio (§2.150): con ella
 * marcada, todos los pines forman una sola tarjeta del feed. Sirve para
 * desactivarlo (los pines vuelven a salir sueltos) o activarlo sobre pines que
 * ya existen. Activarlo falla si los pines tienen ratios distintos.
 */
export function PinsCarouselToggle({
  contentId,
  enabled,
  ratiosMixed,
}: {
  contentId: string
  enabled: boolean
  // Los pines actuales no comparten ratio: no se puede activar.
  ratiosMixed: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function change(next: boolean) {
    setError(null)

    startTransition(async () => {
      const result = await setPinsCarouselAction(contentId, next)

      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div className={styles.carousel}>
      <AdminCheckbox
        label="Formar un carrusel con los pines de este episodio"
        checked={enabled}
        disabled={pending || (!enabled && ratiosMixed)}
        onChange={(event) => change(event.target.checked)}
      />

      <AdminHint>
        {enabled
          ? 'En el feed, los pines salen como una sola tarjeta que va pasando las diapositivas en el orden de esta lista. Todos comparten ratio. Desmarca para que vuelvan a salir sueltos.'
          : ratiosMixed
            ? 'Los pines tienen ratios distintos: unifica el ratio de todos para poder formar un carrusel.'
            : 'Marca para que todos los pines del episodio salgan en el feed como una sola tarjeta con diapositivas.'}
      </AdminHint>

      {error && <AdminMessage kind="error">{error}</AdminMessage>}
    </div>
  )
}
