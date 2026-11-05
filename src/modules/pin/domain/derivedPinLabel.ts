/**
 * Tipos de contenido cuyo pin NO lleva rótulo escrito a mano: el texto del
 * pie del pin sale del propio contenido (case: título + cliente; episode:
 * título + tipo de episodio; insight: título + «Insights by Greener»).
 *
 * Es la ÚNICA fuente de verdad en TypeScript. La base de datos tiene su
 * propia copia de esta lista en `create_pin` y `update_pin`
 * (`v_content_type not in (...)`, última versión en
 * supabase/migrations/20261007100000_pin_label_optional_for_insight.sql);
 * tests/unit/pin/derivedPinLabel.test.ts comprueba que ambas coinciden.
 * Sin ese test, añadir un tipo aquí sin tocar SQL (o al revés) rompe el alta
 * de pines de ese tipo sin que nada avise: es justo lo que pasó con insight.
 */
export const DERIVED_PIN_LABEL_TYPES = ['case', 'episode', 'insight'] as const

export function hasDerivedPinLabel(contentType: string): boolean {
  return (DERIVED_PIN_LABEL_TYPES as readonly string[]).includes(contentType)
}
