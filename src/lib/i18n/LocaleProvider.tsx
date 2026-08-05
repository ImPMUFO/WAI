'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
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

function applyDom(l: Locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = l
  document.documentElement.dir = localeMeta[l].dir
  document.documentElement.setAttribute('data-locale', l)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fa')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Locale | null
      const next = saved && locales.includes(saved) ? saved : 'fa'
      setLocaleState(next)
      applyDom(next)
    } catch {
      applyDom('fa')
    }
    setReady(true)
  }, [])

  const setLocale = useCallback((l: string) => {
    const next: Locale = locales.includes(l as Locale) ? (l as Locale) : 'fa'
    setLocaleState(next)
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      /* ignore */
    }
    applyDom(next)
    try {
      window.dispatchEvent(new CustomEvent('waima-locale', { detail: next }))
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dict: getDictionary(locale),
      setLocale,
      dir: localeMeta[locale].dir,
    }),
    [locale, setLocale]
  )

  // تا localStorage خوانده شود، یک فریم با fa می‌ماند — مشکلی نیست
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    return {
      locale: 'fa',
      dict: getDictionary('fa'),
      setLocale: () => {
        console.warn('LocaleProvider missing')
      },
      dir: 'rtl',
    }
  }
  return ctx
}
