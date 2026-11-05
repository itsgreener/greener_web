import { STAGED_UPLOAD_MAX_AGE_MS } from '@/modules/packages/domain/packageFiles'
import type { StagedUploadSweeper } from '@/modules/packages/domain/packageUploadPorts'

/** Contenidos que se revisan por pasada: una subida suelta es rara, y así la función termina pronto. */
export const STAGED_SWEEP_MAX_FOLDERS = 200

/** Rutas por llamada de borrado a Storage. */
export const STAGED_SWEEP_REMOVE_BATCH = 100

export type StagedSweepResult = {
  scanned: number
  deleted: number
  failed: number
  /** Quedaban más contenidos por revisar: la próxima pasada sigue. */
  truncated: boolean
}

/**
 * Limpieza semanal de la zona de paso (`_incoming/`). Borra las subidas
 * preparadas con más de 24 horas, que ya no va a confirmar nadie. Nunca borra
 * una de fecha desconocida ni una reciente: una subida en curso (el navegador
 * ha terminado de subir y la acción aún no la ha leído) tiene segundos de
 * vida, así que el margen de 24 horas es enorme. Un fallo de borrado no corta
 * la pasada ni se pierde: se cuenta y se reintenta la semana siguiente.
 */
export function makeSweepStagedUploads(deps: {
  sweeper: StagedUploadSweeper
  now?: () => number
}) {
  const now = deps.now ?? Date.now

  return async function sweepStagedUploads(): Promise<StagedSweepResult> {
    const cutoff = now() - STAGED_UPLOAD_MAX_AGE_MS
    const { files, truncated } = await deps.sweeper.listStaged(
      STAGED_SWEEP_MAX_FOLDERS,
    )

    const expired = files
      .filter((file) => file.createdAt !== null && file.createdAt < cutoff)
      .map((file) => file.path)

    let deleted = 0
    let failed = 0

    for (let i = 0; i < expired.length; i += STAGED_SWEEP_REMOVE_BATCH) {
      const batch = expired.slice(i, i + STAGED_SWEEP_REMOVE_BATCH)

      try {
        deleted += await deps.sweeper.remove(batch)
      } catch (error) {
        failed += batch.length
        console.error('Paquetes · limpieza de _incoming:', error)
      }
    }

    return { scanned: files.length, deleted, failed, truncated }
  }
}
