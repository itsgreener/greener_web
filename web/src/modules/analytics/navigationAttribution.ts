'use client'

const STORAGE_KEY =
  'greener:analytics:navigation-source'

const MAX_AGE_MS =
  30 * 60 * 1000

type StoredNavigationSource = {
  destinationPath: string
  section: string
  createdAt: number
}

function normalizePath(
  value: string,
): string | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null
  }

  try {
    return new URL(
      value,
      window.location.origin,
    ).pathname
  } catch {
    return null
  }
}

/**
 * Guarda de forma efímera desde qué sección se ha iniciado una
 * navegación interna.
 *
 * No contiene información personal y vive únicamente en sessionStorage.
 */
export function rememberNavigationSource(
  destination: string,
  section: string,
): void {
  if (
    typeof window ===
    'undefined'
  ) {
    return
  }

  const destinationPath =
    normalizePath(
      destination,
    )

  const normalizedSection =
    section.trim()

  if (
    !destinationPath ||
    !normalizedSection
  ) {
    return
  }

  const value: StoredNavigationSource =
    {
      destinationPath,
      section:
        normalizedSection,
      createdAt:
        Date.now(),
    }

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        value,
      ),
    )
  } catch {
    // sessionStorage puede estar deshabilitado.
    // La navegación debe seguir funcionando igualmente.
  }
}

/**
 * Recupera la atribución solamente si pertenece a la página actual.
 *
 * Siempre consume/elimina el registro para impedir que una atribución
 * antigua termine asociándose posteriormente a otra visita.
 */
export function consumeNavigationSource(): string {
  if (
    typeof window ===
    'undefined'
  ) {
    return 'direct'
  }

  let raw: string | null =
    null

  try {
    raw =
      window.sessionStorage.getItem(
        STORAGE_KEY,
      )

    window.sessionStorage.removeItem(
      STORAGE_KEY,
    )
  } catch {
    return 'direct'
  }

  if (!raw) {
    return 'direct'
  }

  try {
    const parsed =
      JSON.parse(
        raw,
      ) as Partial<StoredNavigationSource>

    if (
      typeof parsed.destinationPath !==
        'string' ||
      typeof parsed.section !==
        'string' ||
      typeof parsed.createdAt !==
        'number'
    ) {
      return 'direct'
    }

    if (
      Date.now() -
        parsed.createdAt >
      MAX_AGE_MS
    ) {
      return 'direct'
    }

    if (
      parsed.destinationPath !==
      window.location.pathname
    ) {
      return 'direct'
    }

    return (
      parsed.section.trim() ||
      'direct'
    )
  } catch {
    return 'direct'
  }
}