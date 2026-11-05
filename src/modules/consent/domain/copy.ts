/**
 * Textos de la ventana de cookies. De momento solo en inglés (la web aún no
 * tiene selector de idioma); la estructura por idioma deja sitio para el
 * castellano, que es el que prevalece a efectos de la normativa española.
 *
 * El contenido es el del documento «Ventana de cookies» de Greener. Si cambia,
 * sube `CONSENT_TEXT_VERSION` (consent.ts) para volver a preguntar.
 */

export interface ConsentCopy {
  title: string
  body: string
  accept: string
  reject: string
  policyLink: string
  close: string
  /** Bloque «Your cookie choice» de la página /privacy. */
  choiceHeading: string
  choiceStatus: (status: 'accepted' | 'rejected' | 'undecided') => string
}

export const CONSENT_COPY = {
  en: {
    title: 'Cookies',
    body: 'This site uses no advertising or tracking cookies. We only store what the site needs to work, and we measure visits with Plausible, which identifies no one. Embedded videos set cookies from YouTube and Spotify when you play them.',
    accept: 'Accept',
    reject: 'Reject',
    policyLink: 'Cookie Policy',
    close: 'Close and reject cookies',
    choiceHeading: 'Your cookie choice',
    choiceStatus: (status) =>
      status === 'accepted'
        ? 'Current choice: cookies accepted. Embedded videos can load when you press play.'
        : status === 'rejected'
          ? 'Current choice: cookies rejected. No embedded video is loaded.'
          : 'You have not made a choice yet. No embedded video is loaded.',
  },
} as const satisfies Record<string, ConsentCopy>

export type ConsentLocale = keyof typeof CONSENT_COPY

export const DEFAULT_CONSENT_LOCALE: ConsentLocale = 'en'

/** Ancla de /privacy donde se cambia la decisión. */
export const COOKIE_CHOICE_ANCHOR = 'cookie-choice'
