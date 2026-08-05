'use client'

import { locales, localeMeta, type Locale } from '@/lib/i18n/dictionaries'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <select
      value={locale}
      onChange={(e) => {
        const v = e.target.value as Locale
        setLocale(v)
      }}
      className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--text)]"
      aria-label="Language"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeMeta[l].flag} {localeMeta[l].label}
        </option>
      ))}
    </select>
  )
}
