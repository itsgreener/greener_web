import { describe, expect, it, vi } from 'vitest'

import { makeGeneratePreviewLink } from '@/modules/content/application/generatePreviewLink'

function setup(content: { id: string; type: string; slug: string } | null) {
  const contents = { getById: vi.fn(async () => content as never) }
  const encodePreviewToken = vi.fn((id: string) => `token-${id}`)
  const generatePreviewLink = makeGeneratePreviewLink({
    contents,
    encodePreviewToken,
    siteUrl: 'https://greener.test',
  })

  return { contents, encodePreviewToken, generatePreviewLink }
}

describe('generatePreviewLink (§15.3)', () => {
  it('firma el id del contenido y lo añade a la URL pública de su tipo', async () => {
    const { generatePreviewLink, encodePreviewToken } = setup({
      id: 'c1',
      type: 'case',
      slug: 'mi-caso',
    })

    expect(await generatePreviewLink('c1')).toBe(
      'https://greener.test/work/mi-caso?preview=token-c1',
    )
    expect(encodePreviewToken).toHaveBeenCalledWith('c1')
  })

  it('usa la ruta de cada tipo (tool, insight, other)', async () => {
    expect(
      await setup({ id: 'c', type: 'tool', slug: 'x' }).generatePreviewLink(
        'c',
      ),
    ).toContain('/tools/x?preview=')
    expect(
      await setup({ id: 'c', type: 'insight', slug: 'x' }).generatePreviewLink(
        'c',
      ),
    ).toContain('/insights/x/app?preview=')
    expect(
      await setup({ id: 'c', type: 'other', slug: 'x' }).generatePreviewLink(
        'c',
      ),
    ).toContain('/variety/x/app?preview=')
  })

  it('devuelve null y no firma nada si el contenido no existe', async () => {
    const { generatePreviewLink, encodePreviewToken } = setup(null)

    expect(await generatePreviewLink('nope')).toBeNull()
    expect(encodePreviewToken).not.toHaveBeenCalled()
  })
})
