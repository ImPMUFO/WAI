'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X, User, Mail, LogIn, Palette, Globe } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export default function SiteMenu() {
  const { dict, dir, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  // دکمه منو در هدر سمت «پایان» است (چپ در RTL، راست در LTR)
  // پنل باید از همان سمت باز شود
  const isRtl = dir !== 'ltr'
  const panelSide: 'left' | 'right' = isRtl ? 'left' : 'right'

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
    if (!open) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const close = () => {
    setVisible(false)
    window.setTimeout(() => setOpen(false), 260)
  }

  const openMenu = () => {
    setOpen(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
  }

  const items = [
    { href: '/account', icon: User, label: dict.accountTitle || 'مدیریت حساب' },
    { href: '/contact', icon: Mail, label: dict.contact || 'ارتباط با ما' },
    ...(!loggedIn
      ? [{ href: '/auth', icon: LogIn, label: dict.login || 'ورود' }]
      : []),
  ]

  const closedTransform =
    panelSide === 'right' ? 'translateX(105%)' : 'translateX(-105%)'

  return (
    <>
      <button
        type="button"
        aria-label="menu"
        aria-expanded={open}
        onClick={openMenu}
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] shadow-sm"
        style={{ background: 'var(--card-solid)', color: 'var(--text)' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]" dir={dir}>
          <button
            type="button"
            aria-label="close"
            onClick={close}
            className="absolute inset-0 border-0 cursor-default"
            style={{
              background: 'rgba(2, 6, 23, 0.9)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.25s ease',
            }}
          />

          <aside
            role="dialog"
            aria-modal="true"
            className="absolute top-0 h-full w-[min(100%,19rem)] flex flex-col"
            style={{
              [panelSide === 'right' ? 'right' : 'left']: 0,
              background: 'var(--card-solid)',
              color: 'var(--text)',
              borderLeft: panelSide === 'right' ? '1px solid var(--border)' : undefined,
              borderRight: panelSide === 'left' ? '1px solid var(--border)' : undefined,
              boxShadow:
                panelSide === 'right'
                  ? '-20px 0 50px rgba(0,0,0,0.45)'
                  : '20px 0 50px rgba(0,0,0,0.45)',
              transform: visible ? 'translateX(0)' : closedTransform,
              transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* هدر */}
            <div
              className="flex items-center justify-between px-4 py-4 shrink-0"
              style={{
                borderBottom: '1px solid var(--border)',
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent)',
              }}
            >
              <div className="min-w-0">
                <p className="font-bold text-sm tracking-wide">{dict.menu || 'منو'}</p>
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                  {dict.brandName}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* لینک‌ها — یکپارچه */}
            <nav key={locale} className="px-3 pt-4 pb-2">
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--border)', background: 'var(--card)' }}
              >
                {items.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className="flex items-center gap-3 px-3.5 py-3.5 text-sm font-medium transition-colors"
                    style={{
                      color: 'var(--text)',
                      borderTop: i === 0 ? undefined : '1px solid var(--border)',
                    }}
                  >
                    <span
                      className="w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"
                      style={{
                        background: 'var(--accent-dim)',
                        color: 'var(--accent)',
                      }}
                    >
                      <item.icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* پوسته و زبان */}
            <div className="px-3 py-2 space-y-3">
              <div
                className="rounded-2xl p-3.5 space-y-3"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  {dict.appearance || 'پوسته ظاهری'}
                </div>
                <ThemeSwitcher />
              </div>

              <div
                className="rounded-2xl p-3.5 space-y-3"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Globe className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  {dict.language || 'زبان'}
                </div>
                <LanguageSwitcher />
              </div>
            </div>

            <p
              className="mt-auto px-5 py-4 text-[11px] leading-relaxed"
              style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}
            >
              {dict.menuHint ||
                'گفتگو، نقشه ذهنی، بازی و گفتگوی جهانی از صفحه اصلی در دسترس‌اند.'}
            </p>
          </aside>
        </div>
      )}
    </>
  )
}
