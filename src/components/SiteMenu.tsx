'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X, User, Mail, LogIn, Palette, Globe } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * منوی سه‌خطی — قابلیت‌های فرعی
 * حساب، ارتباط با ما، ورود، پوسته، زبان
 */
export default function SiteMenu() {
  const { dict, dir } = useLocale()
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    try {
      const supabase = createClient()
      void supabase.auth.getSession().then(({ data }) => {
        setLoggedIn(Boolean(data.session?.user))
      })
    } catch {
      /* ignore */
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const side = dir === 'rtl' ? 'right-0' : 'left-0'

  return (
    <>
      <button
        type="button"
        aria-label="منو"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:border-[var(--accent)]/50"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="بستن"
            onClick={() => setOpen(false)}
          />
          <aside
            className={`absolute top-0 ${side} h-full w-[min(100%,20rem)] bg-[var(--card-solid)] border-[var(--border)] ${
              dir === 'rtl' ? 'border-l' : 'border-r'
            } shadow-2xl p-4 flex flex-col gap-4`}
            style={{ color: 'var(--text)' }}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">منو</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-lg border border-[var(--border)] inline-flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 text-sm">
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[var(--accent-dim)]"
              >
                <User className="w-4 h-4 text-[var(--accent)]" />
                مدیریت حساب
              </Link>
              <Link
                href="/contact"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[var(--accent-dim)]"
              >
                <Mail className="w-4 h-4 text-[var(--accent)]" />
                ارتباط با ما
              </Link>
              {!loggedIn && (
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[var(--accent-dim)]"
                >
                  <LogIn className="w-4 h-4 text-[var(--accent)]" />
                  {dict.login}
                </Link>
              )}
            </nav>

            <div className="border-t border-[var(--border)] pt-3 space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <Palette className="w-3.5 h-3.5" />
                پوسته ظاهری
              </div>
              <ThemeSwitcher />
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] pt-1">
                <Globe className="w-3.5 h-3.5" />
                زبان
              </div>
              <LanguageSwitcher />
            </div>

            <p className="mt-auto text-[10px] text-[var(--muted)] leading-relaxed">
              قابلیت‌های اصلی (گفتگو، نقشه، بازی، گفتگوی جهانی) از صفحه اصلی در دسترس‌اند.
            </p>
          </aside>
        </div>
      )}
    </>
  )
}
