/**
 * Consentimiento de cookies (ventana de cookies, 13 oct 2026). Dominio puro:
 * qué se guarda, cuándo caduca y cuándo hay que volver a preguntar.
 *
 * Lo único que se guarda es la decisión, la versión del texto que se mostró y
 * la fecha, en la cookie propia `greener_consent` (24 meses). No lleva
 * identificador alguno: sirve para recordar la elección y para saber cuándo
 * toca volver a preguntar, no para identificar al visitante.
 */

export const CONSENT_COOKIE_NAME = 'greener_consent'

/**
 * Versión del texto de la ventana y de la política. Súbela cada vez que
 * cambie su contenido: quien decidió con una versión anterior vuelve a ver la
 * ventana. Formato: fecha de «Última actualización» de la política.
 */
export const CONSENT_TEXT_VERSION = '2026-10-01'

/** 24 meses (la guía de la AEPD no recomienda superar los 24). */
export const CONSENT_MAX_AGE_DAYS = 730
export const CONSENT_MAX_AGE_SECONDS = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60

export type ConsentDecision = 'accepted' | 'rejected'

/**
 * - `unknown`: aún no se ha leído la cookie (render de servidor, primer
 *   render del cliente). Se trata como «no aceptado».
 * - `undecided`: no hay decisión válida (primera visita, caducada o de otra
 *   versión del texto).
 */
export type ConsentStatus = 'unknown' | 'undecided' | ConsentDecision

export interface ConsentRecord {
  decision: ConsentDecision
  version: string
  /** Instante de la decisión, ISO 8601. */
  decidedAt: string
}

/** Cómo se llegó a la decisión; solo alimenta el contador anónimo. */
export type ConsentChoice = 'accept' | 'reject' | 'close'

export function createConsentRecord(
  decision: ConsentDecision,
  now: Date = new Date(),
): ConsentRecord {
  return {
    decision,
    version: CONSENT_TEXT_VERSION,
    decidedAt: now.toISOString(),
  }
}

export function serializeConsent(record: ConsentRecord): string {
  return encodeURIComponent(
    JSON.stringify({
      d: record.decision,
      v: record.version,
      t: record.decidedAt,
    }),
  )
}

/**
 * Lee el valor de la cookie. Devuelve `null` si no existe, está corrupto,
 * es de otra versión del texto, tiene más de 24 meses o está fechado en el
 * futuro: en todos esos casos hay que volver a preguntar.
 */
export function parseConsent(
  raw: string | null | undefined,
  now: Date = new Date(),
): ConsentRecord | null {
  if (!raw) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null

  const { d, v, t } = parsed as Record<string, unknown>

  if (d !== 'accepted' && d !== 'rejected') return null
  if (v !== CONSENT_TEXT_VERSION) return null
  if (typeof t !== 'string') return null

  const decidedAt = Date.parse(t)
  if (Number.isNaN(decidedAt)) return null

  const ageMs = now.getTime() - decidedAt
  // Un día de margen por relojes desajustados; más allá, valor sospechoso.
  if (ageMs < -24 * 60 * 60 * 1000) return null
  if (ageMs > CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return null

  return { decision: d, version: v, decidedAt: t }
}

export function consentStatusOf(record: ConsentRecord | null): ConsentStatus {
  return record ? record.decision : 'undecided'
}

/** Solo un «sí» válido y vigente permite cargar contenido de terceros. */
export function allowsThirdParties(status: ConsentStatus): boolean {
  return status === 'accepted'
}

/** Nombre de la decisión que registra el contador anónimo («Cookie Choice»). */
export function choiceFor(
  decision: ConsentDecision,
  closedWithX: boolean,
): ConsentChoice {
  if (decision === 'accepted') return 'accept'
  return closedWithX ? 'close' : 'reject'
}
