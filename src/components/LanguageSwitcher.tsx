'use client'

import { useEffect, useState } from 'react'
import { locales, localeMeta, type Locale } from '@/lib/i18n/dictionaries'

const LANG_KEY = 'waima_locale'

export default function LanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>('fa')

  useEffect(() => {
    const saved = (localStorage.getItem(LANG_KEY) as Locale) || 'fa'
    const next = locales.includes(saved) ? saved : 'fa'
    setLocale(next)
    applyLocale(next)
  }, [])

  const applyLocale = (l: Locale) => {
    const meta = localeMeta[l]
    document.documentElement.lang = l
    document.documentElement.dir = meta.dir
    document.documentElement.setAttribute('data-locale', l)
    localStorage.setItem(LANG_KEY, l)
    window.dispatchEvent(new CustomEvent('waima-locale', { detail: l }))
  }

  const onChange = (l: Locale) => {
    setLocale(l)
    applyLocale(l)
  }

  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value as Locale)}
      className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text)]"
      aria-label="Language"
    >
      {locales.map((l) => (
        <option key={l} value={l} className="bg-slate-900">
          {localeMeta[l].flag} {localeMeta[l].label}
        </option>
      ))}
    </select>
  )
}
