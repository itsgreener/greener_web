import type { Metadata } from 'next'

import { CookieChoice } from '@/components/consent/CookieChoice'
import { POLICY, type PolicyBlock } from './policyContent'
import styles from './page.module.css'

/**
 * Página única «Privacy & Cookies». El texto vive en `policyContent.ts`
 * (provisional, pendiente del texto final del asesor legal); aquí solo se
 * pinta. El aviso legal, las condiciones y la política de privacidad del
 * formulario de contacto aún no tienen página propia (arquitectura §17.3).
 */
export const metadata: Metadata = {
  title: 'Privacy & Cookies',
}

function Block({ block }: { block: PolicyBlock }) {
  switch (block.type) {
    case 'p':
      return <p className={styles.paragraph}>{block.text}</p>
    case 'list':
      return (
        <ul className={styles.list}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
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
        {POLICY.title} · Last updated:{' '}
        <time dateTime={POLICY.lastUpdatedIso}>{POLICY.lastUpdated}</time>
      </p>

      <CookieChoice />

      {POLICY.sections.map((section) => (
        <section key={section.id} className={styles.section}>
          <h2 id={section.id} className={styles.heading}>
            {section.heading}
          </h2>
          {section.blocks.map((block, index) => (
            <Block key={index} block={block} />
          ))}
        </section>
      ))}
    </div>
  )
}
