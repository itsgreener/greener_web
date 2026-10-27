import { cx } from '@/lib/cx'

import styles from './TypeCard.module.css'

type TypeCardProps = {
  name: string
  value: string
  symbol: string
  label: string
  description: string
  selected: boolean
  required?: boolean
  onSelect: () => void
}

/** Tarjeta de un radio (tipo de contenido o subtipo de Other). */
export function TypeCard({
  name,
  value,
  symbol,
  label,
  description,
  selected,
  required,
  onSelect,
}: TypeCardProps) {
  return (
    <label className={cx(styles.typeCard, selected && styles.selected)}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onSelect}
        required={required}
      />

      <span className={styles.symbol}>{symbol}</span>

      <span className={styles.copy}>
        <strong className={styles.copyTitle}>{label}</strong>

        <small className={styles.copyText}>{description}</small>
      </span>

      <span className={styles.check} aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
    </label>
  )
}
