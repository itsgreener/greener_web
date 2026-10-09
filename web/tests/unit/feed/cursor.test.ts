import { describe, it, expect } from 'vitest'
import {
  encodeCursor,
  decodeCursor,
} from '@/modules/feed/infrastructure/cursor'

describe('cursor del feed — opaco y firmado (§8.5)', () => {
  it('codifica y decodifica el mismo payload', () => {
    const cursor = encodeCursor({ sessionId: 'session-a', roundIndex: 3 })
    expect(decodeCursor(cursor)).toEqual({
      sessionId: 'session-a',
      roundIndex: 3,
    })
  })

  it('rechaza un cursor con la firma alterada', () => {
    const cursor = encodeCursor({ sessionId: 'session-a', roundIndex: 0 })
    const [body] = cursor.split('.')
    const tampered = `${body}.firmafalsa`
    expect(decodeCursor(tampered)).toBeNull()
  })

  it('rechaza un cursor cuyo cuerpo fue alterado tras firmarlo (roundIndex fabricado)', () => {
    const cursor = encodeCursor({ sessionId: 'session-a', roundIndex: 0 })
    const [, signature] = cursor.split('.')
    const forgedBody = Buffer.from(
      JSON.stringify({ sessionId: 'session-a', roundIndex: 999 }),
      'utf-8',
    ).toString('base64url')
    expect(decodeCursor(`${forgedBody}.${signature}`)).toBeNull()
  })

  it('rechaza basura que no tiene el formato cuerpo.firma', () => {
    expect(decodeCursor('no-es-un-cursor')).toBeNull()
    expect(decodeCursor('')).toBeNull()
  })

  it('dos payloads distintos producen cursores distintos', () => {
    const a = encodeCursor({ sessionId: 'session-a', roundIndex: 0 })
    const b = encodeCursor({ sessionId: 'session-b', roundIndex: 0 })
    expect(a).not.toBe(b)
  })
})
