// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { JsonLd } from '@/components/seo/JsonLd'

describe('<JsonLd>', () => {
  it('pinta un script application/ld+json cuyo contenido es JSON válido', () => {
    const { container } = render(
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Thing' }} />,
    )
    const script = container.querySelector('script[type="application/ld+json"]')

    expect(script).not.toBeNull()
    expect(JSON.parse(script?.textContent ?? '')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Thing',
    })
  })

  it('un texto con </script> no rompe el marcado: sigue habiendo un solo script', () => {
    const { container } = render(
      <JsonLd data={{ name: '</script><b id="intruso">x</b>' }} />,
    )

    expect(container.querySelectorAll('script')).toHaveLength(1)
    expect(container.querySelector('#intruso')).toBeNull()
  })
})
