'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X, User, Mail, LogIn, Palette, Globe } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * منوی سه‌خطی — پنل مات، خوانا، جدا از پس‌زمینه سایت
 */
export default function SiteMenu() {
  const { dict, dir } = useLocale()
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    if (!open) return
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
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isRtl = dir !== 'ltr'

  return (
    <>
      <button
        type="button"
        aria-label="منو"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] shadow-sm"
        style={{
          background: 'var(--card-solid)',
          color: 'var(--text)',
        }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            className="absolute inset-0 border-0 cursor-default"
            style={{ background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(4px)' }}
            aria-label="بستن"
            onClick={() => setOpen(false)}
          />

          <aside
            className={`absolute top-0 ${isRtl ? 'right-0' : 'left-0'} h-full w-[min(100%,19.5rem)] flex flex-col`}
            style={{
              background: 'var(--card-solid)',
              color: 'var(--text)',
              borderLeft: isRtl ? '1px solid var(--border)' : undefined,
              borderRight: !isRtl ? '1px solid var(--border)' : undefined,
              boxShadow: isRtl
                ? '-12px 0 40px rgba(0,0,0,0.35)'
                : '12px 0 40px rgba(0,0,0,0.35)',
            }}
            dir={dir}
          >
            <div
              className="flex items-center justify-between px-4 py-3.5 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                  منو
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {dict.brandName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl inline-flex items-center justify-center"
                style={{
                  background: 'var(--accent-dim)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-1.5 px-3 py-4">
              {[
                { href: '/account', icon: User, label: 'مدیریت حساب' },
                { href: '/contact', icon: Mail, label: 'ارتباط با ما' },
                ...(!loggedIn
                  ? [{ href: '/auth', icon: LogIn, label: dict.login || 'ورود' }]
                  : []),
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition"
                  style={{
                    background: 'var(--card)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    <item.icon className="w-4 h-4" />
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div
              className="mx-3 mb-3 rounded-2xl p-3 space-y-3"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text)' }}>
                <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                پوسته ظاهری
              </div>
              <div className="relative z-10">
                <ThemeSwitcher />
              </div>

              <div
                className="pt-2 mt-1 flex items-center gap-2 text-xs font-medium"
                style={{ color: 'var(--text)', borderTop: '1px solid var(--border)' }}
              >
                <Globe className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                زبان
              </div>
              <div className="relative z-10">
                <LanguageSwitcher />
              </div>
            </div>

            <p
              className="mt-auto px-4 py-4 text-[11px] leading-relaxed"
              style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}
            >
              گفتگو، نقشه ذهنی، بازی و گفتگوی جهانی از صفحه اصلی در دسترس‌اند.
            </p>
          </aside>
        </div>
      )}
    </>
  )
}
