/**

 * Lee el cuerpo de una petición contando bytes y cortando al pasar el tope

 * (SEC-PUB-C1). `Content-Length` no basta: falta con `Transfer-Encoding:

 * chunked` y puede mentir, y `request.text()` o `formData()` leen el cuerpo

 * entero antes de que nadie mida nada.

 *

 * Al pasar el tope se cancela el flujo y se devuelve `tooLarge`: no se sigue

 * recibiendo.

 */

export type BoundedBody =
  { ok: true; bytes: Uint8Array } | { ok: false; reason: 'too_large' }

export async function readBodyWithLimit(
  request: Request,

  maxBytes: number,
): Promise<BoundedBody> {
  const body = request.body

  if (!body) return { ok: true, bytes: new Uint8Array(0) }

  const reader = body.getReader()

  const chunks: Uint8Array[] = []

  let received = 0

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    received += value.byteLength

    if (received > maxBytes) {
      await reader.cancel().catch(() => {})

      return { ok: false, reason: 'too_large' }
    }

    chunks.push(value)
  }

  const bytes = new Uint8Array(received)

  let offset = 0

  for (const chunk of chunks) {
    bytes.set(chunk, offset)

    offset += chunk.byteLength
  }

  return { ok: true, bytes }
}
