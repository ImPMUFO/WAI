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
    if (open) {
      setVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const close = () => {
    setVisible(false)
    window.setTimeout(() => setOpen(false), 220)
  }

  const openMenu = () => {
    setOpen(true)
    requestAnimationFrame(() => setVisible(true))
  }

  const isRtl = dir !== 'ltr'

  const items = [
    { href: '/account', icon: User, label: dict.accountTitle || 'مدیریت حساب' },
    { href: '/contact', icon: Mail, label: dict.contact || 'ارتباط با ما' },
    ...(!loggedIn
      ? [{ href: '/auth', icon: LogIn, label: dict.login || 'ورود' }]
      : []),
  ]

  return (
    <>
      <button
        type="button"
        aria-label="menu"
        onClick={openMenu}
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[var(--border)] shadow-sm"
        style={{ background: 'var(--card-solid)', color: 'var(--text)' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]" dir={dir}>
          {/* Overlay کامل — محتوا پشت دیده نمی‌شود */}
          <button
            type="button"
            aria-label="close"
            onClick={close}
            className="absolute inset-0 border-0"
            style={{
              background: 'rgba(0,0,0,0.88)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.22s ease',
            }}
          />

          <aside
            className={`absolute top-0 ${isRtl ? 'right-0' : 'left-0'} h-full w-[min(100%,20rem)] flex flex-col`}
            style={{
              background: 'var(--card-solid)',
              color: 'var(--text)',
              borderLeft: isRtl ? '1px solid var(--border)' : undefined,
              borderRight: !isRtl ? '1px solid var(--border)' : undefined,
              boxShadow: isRtl ? '-16px 0 48px rgba(0,0,0,0.5)' : '16px 0 48px rgba(0,0,0,0.5)',
              transform: visible
                ? 'translateX(0)'
                : isRtl
                  ? 'translateX(100%)'
                  : 'translateX(-100%)',
              transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-4 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <p className="font-bold text-sm">{dict.menu || 'منو'}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {dict.brandName}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="w-9 h-9 rounded-xl inline-flex items-center justify-center"
                style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav key={locale} className="flex flex-col gap-2 px-3 py-4">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium"
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
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                <Palette className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                {dict.appearance || 'پوسته ظاهری'}
              </div>
              <ThemeSwitcher />
              <div
                className="pt-2 flex items-center gap-2 text-xs font-medium"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <Globe className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                {dict.language || 'زبان'}
              </div>
              <LanguageSwitcher />
            </div>

            <p
              className="mt-auto px-4 py-4 text-[11px] leading-relaxed"
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
