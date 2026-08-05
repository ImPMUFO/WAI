'use client'

import { useEffect, useState } from 'react'
import {
  LANG_KEY,
  getDictionary,
  locales,
  type Dictionary,
  type Locale,
} from '@/lib/i18n/dictionaries'

export function useLocale() {
  const [locale, setLocale] = useState<Locale>('fa')
  const [dict, setDict] = useState<Dictionary>(getDictionary('fa'))

  useEffect(() => {
    const apply = (l: Locale) => {
      const next = locales.includes(l) ? l : 'fa'
      setLocale(next)
      setDict(getDictionary(next))
    }

    const saved = (localStorage.getItem(LANG_KEY) as Locale) || 'fa'
    apply(saved)

    const onLocale = (e: Event) => {
      const detail = (e as CustomEvent).detail as Locale
      apply(detail)
    }
    window.addEventListener('waima-locale', onLocale as EventListener)
    return () => window.removeEventListener('waima-locale', onLocale as EventListener)
  }, [])

  return { locale, dict }
}
