import { serializeJsonLd } from '@/lib/serializeJsonLd'

/**
 * Datos estructurados (schema.org) de una página, como `<script
 * type="application/ld+json">`. Es un bloque de datos, no código: el
 * navegador no lo ejecuta, así que la CSP con nonce y `strict-dynamic` no lo
 * toca ni necesita nonce.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}
