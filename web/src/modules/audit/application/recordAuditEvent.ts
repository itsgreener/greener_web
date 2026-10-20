import type {
  AuditEvent,
  AuditRecorder,
} from '@/modules/audit/domain/auditRecorder'

/**
 * Anota un hecho en el registro de actividad. **No lanza**: devuelve `false`
 * si no se pudo escribir. Quien llama decide qué hacer: una subida que ya se
 * hizo sigue adelante y solo lo anota en el log del servidor; abrir un CV
 * (datos personales) no se permite sin dejar rastro.
 */
export function makeRecordAuditEvent({
  recorder,
}: {
  recorder: AuditRecorder
}) {
  return async function recordAuditEvent(event: AuditEvent): Promise<boolean> {
    try {
      await recorder.record(event)

      return true
    } catch (error) {
      console.error('Audit: no se pudo escribir en el registro', error)

      return false
    }
  }
}
