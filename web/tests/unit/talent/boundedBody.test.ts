import { describe, expect, it, vi } from 'vitest'

import { readBodyWithLimit } from '@/app/api/talent/_lib/boundedBody'

/** Petición cuyo cuerpo llega en los trozos dados, sin Content-Length. */
function chunked(chunks: Uint8Array[], onCancel?: () => void) {
  let index = 0

  return new Request('https://example.com/x', {
    method: 'POST',
    body: new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index >= chunks.length) return controller.close()
        controller.enqueue(chunks[index++])
      },
      cancel: onCancel,
    }),
    duplex: 'half',
  } as RequestInit)
}

const bytes = (n: number) => new Uint8Array(n).fill(65)

describe('readBodyWithLimit', () => {
  it('sin cuerpo devuelve cero bytes', async () => {
    const result = await readBodyWithLimit(
      new Request('https://example.com/x'),
      10,
    )

    expect(result).toEqual({ ok: true, bytes: new Uint8Array(0) })
  })

  it('junta los trozos y respeta el orden', async () => {
    const result = await readBodyWithLimit(
      chunked([
        new Uint8Array([1, 2]),
        new Uint8Array([3]),
        new Uint8Array([4, 5]),
      ]),
      10,
    )

    expect(result.ok && [...result.bytes]).toEqual([1, 2, 3, 4, 5])
  })

  it('con exactamente el tope pasa; con un byte más, no', async () => {
    expect((await readBodyWithLimit(chunked([bytes(10)]), 10)).ok).toBe(true)
    expect((await readBodyWithLimit(chunked([bytes(11)]), 10)).ok).toBe(false)
  })

  it('al pasar el tope cancela el flujo y no lo sigue leyendo', async () => {
    const onCancel = vi.fn()
    const chunks = Array.from({ length: 50 }, () => bytes(100))

    const result = await readBodyWithLimit(chunked(chunks, onCancel), 250)

    expect(result).toEqual({ ok: false, reason: 'too_large' })
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
