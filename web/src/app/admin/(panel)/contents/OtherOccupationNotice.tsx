import { AdminMessage } from '@/components/admin/AdminMessage'
import {
  OTHER_OCCUPANCY_WARNING_PERCENT,
  isOtherOccupationHigh,
} from '@/modules/content/domain/otherSchema'

type Props = {
  /** Ocupación estimada del feed, en %. */
  percent: number
  /** Qué se está contando, p. ej. «con este contenido publicado». */
  scope: string
  /** Aviso suelto en una tarjeta sin relleno (la lista). */
  inset?: boolean
}

function formatPercent(percent: number): string {
  return percent.toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

/**
 * Aviso no bloqueante de la ocupación del feed por los `other` (plan de
 * other, §7.6). Informa siempre y avisa por encima del 10 %; nunca impide
 * guardar ni publicar.
 */
export default function OtherOccupationNotice({
  percent,
  scope,
  inset,
}: Props) {
  const high = isOtherOccupationHigh(percent)

  return (
    <AdminMessage
      kind={high ? 'warning' : 'notice'}
      inset={inset}
      role={high ? 'status' : undefined}
    >
      Ocupación estimada del feed {scope}:{' '}
      <strong>{formatPercent(percent)} %</strong>.
      {high &&
        ` Supera el ${OTHER_OCCUPANCY_WARNING_PERCENT} %: los Other pueden restar presencia a los demás contenidos. Es solo un aviso, puedes seguir.`}
    </AdminMessage>
  )
}
