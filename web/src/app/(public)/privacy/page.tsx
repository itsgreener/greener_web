import type { Metadata } from 'next'

import { CookieChoice } from '@/components/consent/CookieChoice'
import {
  POLICY,
  type PolicyBlock,
  type PolicyListItem,
} from './policyContent'
import styles from './page.module.css'

/**
 * Página única «Privacy & Cookies», con dos partes ancladas (`#privacy` y
 * `#cookies`). El texto es el del asesor legal y vive en `policyContent.ts`;
 * aquí solo se pinta. El aviso legal y las condiciones aún no tienen página
 * propia (arquitectura §17.3).
 */
export const metadata: Metadata = {
  title: 'Privacy & Cookies',
}

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

function Block({ block }: { block: PolicyBlock }) {
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

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Privacy &amp; Cookies</h1>
      <p className={styles.updated}>
        Last updated:{' '}
        <time dateTime={POLICY.lastUpdatedIso}>{POLICY.lastUpdated}</time>
      </p>
      <p className={styles.paragraph}>{POLICY.intro}</p>

      <CookieChoice />

      {POLICY.sections.map((section) => {
        const Heading = section.level === 3 ? 'h3' : 'h2'

        return (
          <section
            key={section.id}
            className={
              section.level === 3 ? styles.subsection : styles.section
            }
          >
            <Heading
              id={section.id}
              className={
                section.level === 3 ? styles.subheading : styles.heading
              }
            >
              {section.heading}
            </Heading>
            {section.blocks.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
