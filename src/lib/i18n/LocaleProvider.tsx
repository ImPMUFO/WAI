'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  LANG_KEY,
  getDictionary,
  localeMeta,
  locales,
  type Dictionary,
  type Locale,
} from '@/lib/i18n/dictionaries'

type LocaleContextValue = {
  locale: Locale
  dict: Dictionary
  setLocale: (l: Locale) => void
  dir: 'rtl' | 'ltr'
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fa')

  useEffect(() => {
    const saved = (localStorage.getItem(LANG_KEY) as Locale) || 'fa'
    const next = locales.includes(saved) ? saved : 'fa'
    setLocaleState(next)
    document.documentElement.lang = next
    document.documentElement.dir = localeMeta[next].dir
    document.documentElement.setAttribute('data-locale', next)
  }, [])

  const setLocale = (l: Locale) => {
    const next = locales.includes(l) ? l : 'fa'
    setLocaleState(next)
    localStorage.setItem(LANG_KEY, next)
    document.documentElement.lang = next
    document.documentElement.dir = localeMeta[next].dir
    document.documentElement.setAttribute('data-locale', next)
  }

  const value = useMemo(
    () => ({
      locale,
      dict: getDictionary(locale),
      setLocale,
      dir: localeMeta[locale].dir,
    }),
    [locale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    // fallback اگر Provider نبود
    return {
      locale: 'fa' as Locale,
      dict: getDictionary('fa'),
      setLocale: (_l: Locale) => {},
      dir: 'rtl' as const,
    }
  }
  return ctx
}
