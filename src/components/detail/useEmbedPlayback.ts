'use client'

import { useState } from 'react'

import { useConsent } from '@/modules/consent/client/ConsentProvider'

/**
 * Flujo de consentimiento del reproductor embebido de un episodio.
 *
 * NINGÚN embed de tercero se monta hasta que hay un «sí» a las cookies Y el
 * visitante pulsa play. Cargar el iframe ya es instalar las cookies del
 * proveedor (YouTube escribe un identificador en el almacenamiento local al
 * cargar; Spotify planta cookies desde la carga), así que antes de eso solo
 * hay una portada de Greener y un botón de play. Quien ya aceptó carga el
 * reproductor con ese clic, sin volver a preguntar; quien rechazó, o aún no
 * ha decidido, ve la petición en ese momento y, si acepta, queda aceptado
 * para toda la web (se puede revocar desde «Privacy & Cookies» en el menú
 * lateral). Revocar desmonta el reproductor al instante. La guía de la AEPD
 * (mayo de 2024, §3.2.3 d) reconoce pedir el consentimiento justo antes de
 * descargar un vídeo.
 *
 * `onPlay` se llama una vez por cada pulsación que monta el reproductor (con
 * el «sí» ya dado): es donde se registra la analítica.
 */
export function useEmbedPlayback({
  embedKey,
  onPlay,
}: {
  /** Identifica el embed (`episodeEmbedKey`): la aprobación vale solo para él. */
  embedKey: string
  onPlay: () => void
}) {
  const { status, accept } = useConsent()
  const [approvedEmbedKey, setApprovedEmbedKey] = useState<string | null>(null)
  const [askingConsent, setAskingConsent] = useState(false)

  // Aceptar es condición para que haya reproductor, no solo para montarlo:
  // si el visitante revoca el consentimiento, el iframe se desmonta.
  const canRenderEmbed = approvedEmbedKey === embedKey && status === 'accepted'

  function startPlayback() {
    onPlay()
    setAskingConsent(false)
    setApprovedEmbedKey(embedKey)
  }

  /** Clic en el botón de play de la portada. */
  function play() {
    if (status === 'accepted') {
      startPlayback()
      return
    }

    setAskingConsent(true)
  }

  /** «Accept cookies and play» de la petición de consentimiento. */
  function acceptAndPlay() {
    accept()
    startPlayback()
  }

  /** «Not now»: cierra la petición sin cargar nada ni guardar decisión. */
  function cancel() {
    setAskingConsent(false)
  }

  return { canRenderEmbed, askingConsent, play, acceptAndPlay, cancel }
}
