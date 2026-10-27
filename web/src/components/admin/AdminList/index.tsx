import { cx } from '@/lib/cx'

import styles from './AdminList.module.css'

type Props = {
  /** `baseline` cuando cada elemento lleva un párrafo debajo del enlace. */
  align?: 'center' | 'baseline'
  children: React.ReactNode
}

/** Lista de filas sueltas (enlaces, ficheros, subidas): sin viñetas y con huecos fijos. */
export function AdminList({ align = 'center', children }: Props) {
  return (
    <ul className={cx(styles.list, align === 'baseline' && styles.baseline)}>
      {children}
    </ul>
  )
}
