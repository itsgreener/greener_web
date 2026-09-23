import styles from './CharCounter.module.css'

type Props = {
  length: number
  max: number
}

/**
 * Límite blando (área "límites de caracteres", `textLimits.ts`): no
 * bloquea nada, solo avisa. Pasado el máximo se pone en rojo para que
 * el editor sepa que a partir de ahí el frontend público truncará con
 * elipsis (`line-clamp`), pero el guardado sigue funcionando igual.
 */
export function CharCounter({ length, max }: Props) {
  const over = length > max

  return (
    <span className={over ? styles.over : styles.counter}>
      {length}/{max}
    </span>
  )
}
