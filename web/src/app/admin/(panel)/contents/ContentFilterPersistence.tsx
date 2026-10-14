'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const STORAGE_KEY = 'admin.contents.filters.v1'
const FILTER_KEYS = ['q', 'type', 'status', 'page'] as const

/** Keep the current list state across editor navigation within this browser tab. */
export default function ContentFilterPersistence() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const search = searchParams.toString()

  useEffect(() => {
    const params = new URLSearchParams(search)
    if (params.get('clear') === '1') {
      sessionStorage.removeItem(STORAGE_KEY)
      router.replace('/admin/contents')
      return
    }

    const filters = new URLSearchParams()
    for (const key of FILTER_KEYS) {
      const value = params.get(key)
      if (value) filters.set(key, value)
    }
    const current = filters.toString()

    if (current) {
      sessionStorage.setItem(STORAGE_KEY, current)
    } else {
      const previous = sessionStorage.getItem(STORAGE_KEY)
      if (previous) router.replace(`/admin/contents?${previous}`)
    }
  }, [router, search])

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>(
      '.admin-content-filters',
    )
    if (!form) return
    const onSubmit = () => {
      const fields = new FormData(form)
      const next = new URLSearchParams()
      for (const key of ['q', 'type', 'status'] as const) {
        const value = fields.get(key)
        if (typeof value === 'string' && value.trim())
          next.set(key, value.trim())
      }
      // An intentional filter submission replaces the last saved selection.
      if (next.toString()) sessionStorage.setItem(STORAGE_KEY, next.toString())
      else sessionStorage.removeItem(STORAGE_KEY)
    }
    form.addEventListener('submit', onSubmit)
    return () => form.removeEventListener('submit', onSubmit)
  }, [])

  return null
}
