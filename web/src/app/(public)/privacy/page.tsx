import { CookieChoice } from '@/components/consent/CookieChoice'
import { PolicyBlock } from '@/app/(public)/privacy/PolicyBlock'
import { buildPageMetadata } from '@/lib/pageMetadata'
import { POLICY } from './policyContent'
import styles from './page.module.css'

/**
 * Página única «Privacy & Cookies», con dos partes ancladas (`#privacy` y
 * `#cookies`). El texto es el del asesor legal y vive en `policyContent.ts`;
 * aquí solo se pinta. El aviso legal y las condiciones aún no tienen página
 * propia (arquitectura §17.3).
 */
export const metadata = buildPageMetadata({
  title: 'Privacy & Cookies',
  description:
    'How Greener handles personal data and cookies on itsgreener.com.',
})

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Privacy &amp; Cookies</h1>
      <p className={styles.updated}>
        Last updated:{' '}
        <time dateTime={POLICY.lastUpdatedIso}>{POLICY.lastUpdated}</time>
      </p>
      <PolicyBlock block={{ type: 'p', text: POLICY.intro }} />

      <CookieChoice />

      {POLICY.sections.map((section) => {
        const Heading = section.level === 3 ? 'h3' : 'h2'

        return (
          <section
            key={section.id}
            className={section.level === 3 ? styles.subsection : styles.section}
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
              <PolicyBlock key={index} block={block} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
