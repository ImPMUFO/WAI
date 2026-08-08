'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, Mail, LogIn, Palette, Globe, ChevronLeft } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * منوی کناری به سبک محصولات مدرن (Linear / Notion / Stripe)
 * — پس‌زمینه کاملاً مات، بدون دیده شدن محتوای پشت
 * — پنل از همان سمت دکمه
 */
export default function SiteMenu() {
  const { dict, dir, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  const isRtl = dir !== 'ltr'
  // دکمه در انتهای هدر است: RTL = چپ، LTR = راست
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
    window.setTimeout(() => setOpen(false), 280)
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

  const closedX = panelSide === 'right' ? 'translateX(100%)' : 'translateX(-100%)'

  return (
    <>
      {/* دکمه همبرگری — مینیمال و واضح */}
      <button
        type="button"
        aria-label={dict.menu || 'منو'}
        aria-expanded={open}
        onClick={openMenu}
        className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg0)]"
        style={{
          background: 'var(--card-solid)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06)',
        }}
      >
        <span className="sr-only">{dict.menu || 'منو'}</span>
        <span className="flex h-3.5 w-4 flex-col justify-between" aria-hidden>
          <span
            className="block h-[1.5px] w-full rounded-full transition-transform duration-200"
            style={{ background: 'var(--text)' }}
          />
          <span
            className="block h-[1.5px] w-full rounded-full transition-opacity duration-200"
            style={{ background: 'var(--text)' }}
          />
          <span
            className="block h-[1.5px] w-full rounded-full transition-transform duration-200"
            style={{ background: 'var(--text)' }}
          />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[200]" dir={dir}>
          {/* اسکراب کاملاً مات — هیچ چیز از پشت دیده نمی‌شود */}
          <button
            type="button"
            aria-label="close"
            onClick={close}
            className="absolute inset-0 border-0"
            style={{
              background: 'var(--bg0)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.28s ease',
            }}
          />
          {/* لایه دوم برای اطمینان از پوشش افکت‌های تم */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'var(--bg0)',
              opacity: visible ? 1 : 0,
              transition: 'opacity 0.28s ease',
            }}
            aria-hidden
          />

          {/* پنل */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={dict.menu || 'منو'}
            className="absolute top-0 flex h-full w-[min(100%,20rem)] flex-col"
            style={{
              [panelSide === 'right' ? 'right' : 'left']: 0,
              background: 'var(--card-solid)',
              color: 'var(--text)',
              borderInlineStart: '1px solid var(--border)',
              boxShadow:
                panelSide === 'right'
                  ? '-24px 0 48px rgba(0,0,0,0.18)'
                  : '24px 0 48px rgba(0,0,0,0.18)',
              transform: visible ? 'translateX(0)' : closedX,
              transition: 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* هدر پنل */}
            <div
              className="flex shrink-0 items-center justify-between gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="min-w-0">
                <p className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
                  {dict.menu || 'منو'}
                </p>
                <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--muted)' }}>
                  {dict.brandName}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors"
                style={{
                  background: 'var(--accent-dim)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                }}
                aria-label="close"
              >
                <span className="relative block h-3.5 w-3.5" aria-hidden>
                  <span
                    className="absolute left-0 top-1/2 block h-[1.5px] w-full -translate-y-1/2 rotate-45 rounded-full"
                    style={{ background: 'var(--text)' }}
                  />
                  <span
                    className="absolute left-0 top-1/2 block h-[1.5px] w-full -translate-y-1/2 -rotate-45 rounded-full"
                    style={{ background: 'var(--text)' }}
                  />
                </span>
              </button>
            </div>

            {/* ناوبری */}
            <nav key={locale} className="flex-1 overflow-y-auto px-3 py-4">
              <p
                className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted)' }}
              >
                {dict.account || 'حساب'}
              </p>
              <ul className="mb-5 space-y-1">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors"
                      style={{ color: 'var(--text)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--accent-dim)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: 'var(--accent-dim)',
                          color: 'var(--accent)',
                        }}
                      >
                        <item.icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      <ChevronLeft
                        className={`h-4 w-4 opacity-40 ${isRtl ? '' : 'rotate-180'}`}
                        style={{ color: 'var(--muted)' }}
                      />
                    </Link>
                  </li>
                ))}
              </ul>

              <p
                className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted)' }}
              >
                {dict.appearance || 'پوسته ظاهری'}
              </p>
              <div
                className="mb-5 rounded-xl p-3"
                style={{
                  background: 'var(--bg0)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="mb-2 flex items-center gap-2 text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                  <Palette className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                  {dict.appearance || 'پوسته ظاهری'}
                </div>
                <ThemeSwitcher />
              </div>

              <p
                className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--muted)' }}
              >
                {dict.language || 'زبان'}
              </p>
              <div
                className="rounded-xl p-3"
                style={{
                  background: 'var(--bg0)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="mb-2 flex items-center gap-2 text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                  <Globe className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                  {dict.language || 'زبان'}
                </div>
                <LanguageSwitcher />
              </div>
            </nav>

            {/* فوتر */}
            <div
              className="shrink-0 px-5 py-4"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--bg0)' }}
            >
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                {dict.menuHint ||
                  'گفتگو، نقشه ذهنی، بازی و گفتگوی جهانی از صفحه اصلی در دسترس‌اند.'}
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
