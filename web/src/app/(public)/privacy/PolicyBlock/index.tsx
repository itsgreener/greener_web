import type {
  PolicyBlock as PolicyBlockData,
  PolicyListItem,
} from '@/app/(public)/privacy/policyContent'
import styles from './PolicyBlock.module.css'

function ListItem({ item }: { item: PolicyListItem }) {
  if (typeof item === 'string') {
    return <li>{item}</li>
  }

  return (
    <li>
      <strong>{item.label}</strong> {item.text}
    </li>
  )
}

/** Un bloque del texto de la política: párrafo, nota, lista, enlaces o tabla. */
export function PolicyBlock({ block }: { block: PolicyBlockData }) {
  switch (block.type) {
    case 'p':
      return <p className={styles.paragraph}>{block.text}</p>
    case 'note':
      return <p className={styles.note}>{block.text}</p>
    case 'list':
      return (
        <ul className={styles.list}>
          {block.items.map((item) => (
            <ListItem
              key={typeof item === 'string' ? item : item.label}
              item={item}
            />
          ))}
        </ul>
      )
    case 'links':
      return (
        <ul className={styles.list}>
          {block.items.map((item) => (
            <li key={item.href}>
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th key={cell} scope="col">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th key={cell} scope="row">
                        <code>{cell}</code>
                      </th>
                    ) : (
                      <td key={`${row[0]}-${index}`}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}
