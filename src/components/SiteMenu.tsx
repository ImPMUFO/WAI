'use client'

import { ensureWheelChancesBackfill } from '@/lib/gamification'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { User, Mail, LogIn, Palette, Globe, ChevronLeft, X, Dices } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * منوی کناری — موبایل و دسکتاپ
 * با Portal به body تا از stacking context خارج شود
 */
export default function SiteMenu() {
  const { dict, dir, locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [wheelChances, setWheelChances] = useState(0)
  const [mounted, setMounted] = useState(false)

  const isRtl = dir !== 'ltr'
  // دکمه در انتهای هدر: RTL=چپ، LTR=راست
  const fromLeft = isRtl

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const read = () => {
      try {
        // همگام‌سازی شانس‌های قبلی لول
        ensureWheelChancesBackfill()
        setWheelChances(Number(localStorage.getItem('waima_wheel_chances') || '0') || 0)
      } catch {
        setWheelChances(0)
      }
    }
    read()
    window.addEventListener('waima-wheel-chances', read)
    window.addEventListener('waima-level-up', read)
    return () => {
      window.removeEventListener('waima-wheel-chances', read)
      window.removeEventListener('waima-level-up', read)
    }
  }, [])

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
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
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

  const panel = open && mounted ? (
    <div
      className="fixed inset-0"
      style={{ zIndex: 99999 }}
      dir={dir}
    >
      {/* اسکراب کاملاً مات */}
      <button
        type="button"
        aria-label="close"
        onClick={close}
        className="absolute inset-0 border-0 p-0"
        style={{
          background: 'var(--bg0)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={dict.menu || 'منو'}
        className="absolute top-0 bottom-0 flex flex-col"
        style={{
          width: 'min(100vw, 20rem)',
          maxWidth: '100%',
          ...(fromLeft ? { left: 0 } : { right: 0 }),
          background: 'var(--card-solid)',
          color: 'var(--text)',
          borderInlineStart: '1px solid var(--border)',
          boxShadow: fromLeft
            ? '16px 0 48px rgba(0,0,0,0.25)'
            : '-16px 0 48px rgba(0,0,0,0.25)',
          transform: visible
            ? 'translateX(0)'
            : fromLeft
              ? 'translateX(-100%)'
              : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* هدر */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-3.5 shrink-0"
          style={{
            borderBottom: '1px solid var(--border)',
            background: 'var(--card-solid)',
          }}
        >
          <div className="min-w-0">
            <p className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
              {dict.menu || 'منو'}
            </p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--muted)' }}>
              {dict.brandName}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: 'var(--accent-dim)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* محتوا — اسکرول مستقل */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <p
            className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--muted)' }}
          >
            {dict.account || 'حساب'}
          </p>
          <nav key={locale} className="mb-4 space-y-0.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium"
                style={{ color: 'var(--text)' }}
              >
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-start">{item.label}</span>
                <ChevronLeft
                  className={`h-4 w-4 opacity-40 ${isRtl ? '' : 'rotate-180'}`}
                  style={{ color: 'var(--muted)' }}
                />
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => {
              close()
              window.dispatchEvent(new Event('waima-open-wheel'))
            }}
            className="mb-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition"
            style={{
              color: 'var(--text)',
              background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--card-solid)), var(--card-solid))',
              border: '1px solid color-mix(in srgb, var(--accent) 45%, var(--border))',
              boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent)',
            }}
          >
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
              style={{
                background: 'color-mix(in srgb, var(--accent) 25%, var(--bg0))',
                color: 'var(--accent)',
                border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
              }}
            >
              🎡
            </span>
            <span className="flex-1 text-start leading-tight">
              {locale === 'en' ? 'Luck wheel' : locale === 'ar' ? 'عجلة الحظ' : 'گردونه شانس'}
              <span className="block text-[11px] font-normal" style={{ color: 'var(--muted)' }}>
                {wheelChances > 0
                  ? locale === 'en'
                    ? `${wheelChances} spin(s) left`
                    : locale === 'ar'
                      ? `${wheelChances} محاولة متبقية`
                      : `${wheelChances} شانس باقی‌مانده`
                  : locale === 'en'
                    ? 'No spins — level up to earn'
                    : locale === 'ar'
                      ? 'لا محاولات — ارتقِ مستواك'
                      : 'شانسی ندارید — با ارتقای سطح بگیرید'}
              </span>
            </span>
          </button>

          <p
            className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--muted)' }}
          >
            {dict.appearance || 'پوسته ظاهری'}
          </p>
          <div
            className="mb-4 rounded-xl p-3"
            style={{
              background: 'var(--bg0)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="mb-2 flex items-center gap-2 text-[12px] font-medium"
              style={{ color: 'var(--text)' }}
            >
              <Palette className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              {dict.appearance || 'پوسته ظاهری'}
            </div>
            <ThemeSwitcher />
          </div>

          <p
            className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
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
            <div
              className="mb-2 flex items-center gap-2 text-[12px] font-medium"
              style={{ color: 'var(--text)' }}
            >
              <Globe className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              {dict.language || 'زبان'}
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        <div
          className="shrink-0 px-4 py-3"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--bg0)',
          }}
        >
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            {dict.menuHint ||
              'گفتگو، نقشه ذهنی، بازی و گفتگوی جهانی از صفحه اصلی در دسترس‌اند.'}
          </p>
        </div>
      </aside>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        aria-label={dict.menu || 'منو'}
        aria-expanded={open}
        onClick={openMenu}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        style={{
          background: 'var(--card-solid)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <span className="flex h-3.5 w-4 flex-col justify-between" aria-hidden>
          <span className="block h-[1.5px] w-full rounded-full" style={{ background: 'var(--text)' }} />
          <span className="block h-[1.5px] w-full rounded-full" style={{ background: 'var(--text)' }} />
          <span className="block h-[1.5px] w-full rounded-full" style={{ background: 'var(--text)' }} />
        </span>
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  )
}