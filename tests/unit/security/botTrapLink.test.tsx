// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { BotTrapLink } from '@/components/security/BotTrapLink'
import { TRAP_PATH } from '@/lib/botTraps'

describe('BotTrapLink', () => {
  it('apunta al señuelo y es invisible, inenfocable, nofollow y oculto a lectores de pantalla', () => {
    const { container } = render(<BotTrapLink />)

    const link = container.querySelector('a')!
    expect(link).toHaveAttribute('href', TRAP_PATH)
    expect(link).toHaveAttribute('rel', 'nofollow')
    expect(link).toHaveAttribute('tabindex', '-1')
    expect(link).toHaveAttribute('aria-hidden', 'true')
    expect(link).toHaveAttribute('hidden')
  })
})
