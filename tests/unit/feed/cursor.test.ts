import { describe, it, expect } from 'vitest'
import { encodeSignedToken } from '@/lib/security/signedToken'
import {
  encodeCursor,
  decodeCursor,
} from '@/modules/feed/infrastructure/cursor'

describe('cursor del feed — opaco y firmado (§8.5)', () => {
  it('codifica y decodifica el mismo payload', () => {
    const cursor = encodeCursor({
      sessionId: 'session-a',
      roundIndex: 3,
      offset: 40,
      served: 340,
    })
    expect(decodeCursor(cursor)).toEqual({
      sessionId: 'session-a',
      roundIndex: 3,
      offset: 40,
      served: 340,
    })
  })

  it('rechaza un cursor con la firma alterada', () => {
    const cursor = encodeCursor({
      sessionId: 'session-a',
      roundIndex: 0,
      offset: 0,
      served: 0,
    })
    const [body] = cursor.split('.')
    const tampered = `${body}.firmafalsa`
    expect(decodeCursor(tampered)).toBeNull()
  })

  it('rechaza un cursor cuyo cuerpo fue alterado tras firmarlo (roundIndex fabricado)', () => {
    const cursor = encodeCursor({
      sessionId: 'session-a',
      roundIndex: 0,
      offset: 0,
      served: 0,
    })
    const [, signature] = cursor.split('.')
    const forgedBody = Buffer.from(
      JSON.stringify({ sessionId: 'session-a', roundIndex: 999, offset: 0 }),
      'utf-8',
    ).toString('base64url')
    expect(decodeCursor(`${forgedBody}.${signature}`)).toBeNull()
  })

  it('rechaza basura que no tiene el formato cuerpo.firma', () => {
    expect(decodeCursor('no-es-un-cursor')).toBeNull()
    expect(decodeCursor('')).toBeNull()
  })

  it('dos payloads distintos producen cursores distintos', () => {
    const a = encodeCursor({
      sessionId: 'session-a',
      roundIndex: 0,
      offset: 0,
      served: 0,
    })
    const b = encodeCursor({
      sessionId: 'session-b',
      roundIndex: 0,
      offset: 0,
      served: 0,
    })
    expect(a).not.toBe(b)
  })

  it('un cursor sin offset (anterior a servir la ronda por tramos) vale «principio de la ronda»', () => {
    const signed = encodeSignedToken('cursor', {
      sessionId: 'session-a',
      roundIndex: 2,
    })
    expect(decodeCursor(signed)).toEqual({
      sessionId: 'session-a',
      roundIndex: 2,
      offset: 0,
      served: 0,
    })
  })

  it('un cursor anterior a los interludios (sin served) vale «0 pines servidos»', () => {
    const signed = encodeSignedToken('cursor', {
      sessionId: 'session-a',
      roundIndex: 1,
      offset: 40,
    })
    expect(decodeCursor(signed)).toEqual({
      sessionId: 'session-a',
      roundIndex: 1,
      offset: 40,
      served: 0,
    })
  })

  it('rechaza un served negativo o no entero aunque la firma sea válida', () => {
    for (const served of [-1, 2.5, '10']) {
      const signed = encodeSignedToken('cursor', {
        sessionId: 'session-a',
        roundIndex: 0,
        offset: 0,
        served,
      })
      expect(decodeCursor(signed)).toBeNull()
    }
  })

  it('rechaza un offset negativo o no entero aunque la firma sea válida', () => {
    for (const offset of [-1, 1.5, '3']) {
      const signed = encodeSignedToken('cursor', {
        sessionId: 'session-a',
        roundIndex: 0,
        offset,
      })
      expect(decodeCursor(signed)).toBeNull()
    }
  })
})
