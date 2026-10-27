import { Fragment } from 'react'

type Props = {
  /** Las líneas tal y como se ven; el salto se añade entre ellas. */
  lines: readonly string[]
  as?: 'h1' | 'h2'
  className?: string
}

/**
 * Titular con saltos de línea forzados. Cada salto lleva un espacio antes:
 * sin él, el nombre accesible del titular sale pegado («whatyou»). Con el
 * componente ese espacio ya no depende de acordarse de escribirlo.
 */
export function BrokenHeadline({ lines, as: Tag = 'h2', className }: Props) {
  return (
    <Tag className={className}>
      {lines.map((line, index) => (
        <Fragment key={`${index}-${line}`}>
          {line}
          {index < lines.length - 1 && (
            <>
              {' '}
              <br />
            </>
          )}
        </Fragment>
      ))}
    </Tag>
  )
}
