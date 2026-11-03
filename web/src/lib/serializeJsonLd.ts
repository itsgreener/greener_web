/**
 * Serializa datos estructurados (JSON-LD) para incrustarlos en un
 * `<script type="application/ld+json">`.
 *
 * Un `JSON.stringify` a secas no basta: un título con `</script>` cerraría la
 * etiqueta y lo que viniera después se interpretaría como HTML. Se escapa `<`
 * (y los separadores de línea U+2028/U+2029, que antes de ES2019 rompían
 * literales de JavaScript). Sigue siendo JSON válido: `<` es `<`.
 *
 * Lo comparten las páginas de Next (`<JsonLd>`) y el `<head>` que Greener
 * genera para los paquetes HTML (`renderPackageHead`).
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
