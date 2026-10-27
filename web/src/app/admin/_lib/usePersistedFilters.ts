'use client'

import { useCallback, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

import {
  readSession,
  removeSession,
  writeSession,
} from '@/app/admin/_lib/safeSessionStorage'

type Options = {
  /** Clave de `sessionStorage` donde se guarda la última selección. */
  storageKey: string

  /** Ruta del listado, sin query. */
  listPath: string

  /** Parámetros de la URL que forman el estado del listado (incluida `page`). */
  filterKeys: readonly string[]

  /** Query actual de la URL, ya normalizada por la página (sin `?`). */
  search: string

  /** La URL trae `?clear=1`: olvidar lo guardado y limpiar la URL. */
  clear: boolean
}

/**
 * Conserva el estado de un listado (filtros y página) al entrar en un editor y
 * volver, dentro de esta pestaña del navegador:
 *
 * - Con filtros en la URL, los guarda.
 * - Sin ellos, vuelve a poner los últimos guardados.
 * - Con `clear`, los olvida («Limpiar»).
 * - Al enviar el formulario de filtros a propósito, la selección enviada
 *   sustituye a la guardada (`onSubmit`, para el `<form>` del listado). La
 *   página no se guarda al filtrar: un filtro nuevo vuelve a la primera.
 *
 * Lee y escribe con guarda (`safeSessionStorage`).
 */
export function usePersistedFilters({
  storageKey,
  listPath,
  filterKeys,
  search,
  clear,
}: Options) {
  const router = useRouter()

  useEffect(() => {
    if (clear) {
      removeSession(storageKey)
      router.replace(listPath)
      return
    }

    const params = new URLSearchParams(search)
    const filters = new URLSearchParams()
    for (const key of filterKeys) {
      const value = params.get(key)
      if (value) filters.set(key, value)
    }
    const current = filters.toString()

    if (current) {
      writeSession(storageKey, current)
    } else {
      const previous = readSession(storageKey)
      if (previous) router.replace(`${listPath}?${previous}`)
    }
  }, [router, storageKey, listPath, filterKeys, search, clear])

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      const fields = new FormData(event.currentTarget)
      const next = new URLSearchParams()
      for (const key of filterKeys) {
        if (key === 'page') continue
        const value = fields.get(key)
        if (typeof value === 'string' && value.trim()) {
          next.set(key, value.trim())
        }
      }

      if (next.toString()) writeSession(storageKey, next.toString())
      else removeSession(storageKey)
    },
    [filterKeys, storageKey],
  )

  return { onSubmit }
}
