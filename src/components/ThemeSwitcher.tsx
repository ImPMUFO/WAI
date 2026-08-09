'use client'

import { bumpFromTheme } from '@/lib/mindmap'

import { useEffect, useState } from 'react'
import { Palette, Check } from 'lucide-react'
import { THEMES, THEME_KEY, ThemeId, isThemeId } from '@/lib/themes'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export default function ThemeSwitcher() {
  const { dict } = useLocale()
  const [theme, setTheme] = useState<ThemeId>('main')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem(THEME_KEY) || 'main'
      const t = isThemeId(saved) ? saved : 'main'
      setTheme(t)
      document.documentElement.setAttribute('data-theme', t)
    }
    read()
    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail
      if (typeof d === 'string' && isThemeId(d)) {
        setTheme(d)
      } else {
        read()
      }
    }
    window.addEventListener('waima-theme', onCustom as EventListener)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener('waima-theme', onCustom as EventListener)
      window.removeEventListener('storage', read)
    }
  }, [])

  const apply = (id: ThemeId) => {
    setTheme(id)
    localStorage.setItem(THEME_KEY, id)
    document.documentElement.setAttribute('data-theme', id)
    try {
      try { bumpFromTheme(String(id)) } catch { /* */ }
      window.dispatchEvent(new CustomEvent('waima-theme', { detail: id }))
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--accent)]/50 transition-all text-xs sm:text-sm"
        aria-label={dict.appearance}
      >
        <Palette className="w-4 h-4 text-[var(--accent)]" />
        <span>{dict.appearance}</span>
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="close" onClick={() => setOpen(false)} />
          <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-50 w-[min(100vw-2rem,340px)] rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] backdrop-blur-xl shadow-2xl p-3">
            <p className="text-[11px] text-[var(--muted)] mb-2 px-1">{dict.appearance}</p>
            <div className="grid grid-cols-1 gap-1.5">
              {THEMES.map((t) => {
                const active = theme === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => apply(t.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-all ${
                      active
                        ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/40 scale-[1.01]'
                        : 'hover:bg-[var(--card)] border border-transparent'
                    }`}
                  >
                    <span className="flex gap-1 shrink-0">
                      {t.preview.map((c) => (
                        <span
                          key={c}
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--text)]">{dict[t.nameKey]}</span>
                      <span className="block text-[10px] text-[var(--muted)]">{dict[t.descKey]}</span>
                    </span>
                    {active && <Check className="w-4 h-4 mr-auto text-[var(--accent)]" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
