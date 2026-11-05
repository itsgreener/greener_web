'use client'

import type { ReactNode } from 'react'

import { usePersistedFilters } from '@/app/admin/_lib/usePersistedFilters'
import { AdminFilterBar } from '@/components/admin/AdminFilterBar'

const STORAGE_KEY = 'admin.contents.filters.v1'
const FILTER_KEYS = ['q', 'type', 'status', 'page'] as const

/**
 * Barra de filtros del listado de contenidos, con memoria: al entrar en un
 * editor y volver, el listado reaparece con los mismos filtros y página
 * (`usePersistedFilters`). Los campos los pone la página, que es de servidor.
 */
export default function ContentFilterBar({
  search,
  clear,
  children,
}: {
  /** Query actual de la URL, normalizada por la página (sin `?`). */
  search: string
  clear: boolean
  children: ReactNode
}) {
  const { onSubmit } = usePersistedFilters({
    storageKey: STORAGE_KEY,
    listPath: '/admin/contents',
    filterKeys: FILTER_KEYS,
    search,
    clear,
  })

  return <AdminFilterBar onSubmit={onSubmit}>{children}</AdminFilterBar>
}
