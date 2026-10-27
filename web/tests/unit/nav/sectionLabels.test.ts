import { describe, expect, it } from 'vitest'

import { SECTION_LABELS } from '@/components/nav/sectionLabels'
import { navItems } from '@/components/shell/Shell/navItems'

describe('SECTION_LABELS', () => {
  it('el menú lateral usa los mismos nombres de sección', () => {
    const labels = navItems.map((item) => item.label)

    for (const label of Object.values(SECTION_LABELS)) {
      expect(labels).toContain(label)
    }
  })

  it('el menú lateral lleva «We did it» a la home y las demás a su sección', () => {
    const hrefOf = (label: string) =>
      navItems.find((item) => item.label === label)?.href

    expect(hrefOf(SECTION_LABELS.work)).toBe('/')
    expect(hrefOf(SECTION_LABELS.channel)).toBe('/channel')
    expect(hrefOf(SECTION_LABELS.insights)).toBe('/insights')
    expect(hrefOf(SECTION_LABELS.tools)).toBe('/tools')
  })
})
