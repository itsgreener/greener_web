// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import GlobalError from '@/app/global-error'
import { ErrorPage } from '@/components/status/ErrorPage'
import { ERROR_COPY } from '@/components/status/ErrorPage/copy'

const props = { error: new Error('boom'), reset: () => {} }

describe('ERROR_COPY', () => {
  it.each([
    ['ErrorPage', <ErrorPage key="a" {...props} />],
    ['global-error', <GlobalError key="b" {...props} />],
  ])('%s pinta el texto común de error', (_name, element) => {
    const html = renderToStaticMarkup(element)

    expect(html).toContain(ERROR_COPY.title)
    expect(html).toContain(ERROR_COPY.message)
    expect(html).toContain(ERROR_COPY.retry)
    expect(html).toContain(ERROR_COPY.home)
  })
})
