
'use client'

import Link from 'next/link'
import { useLocale } from '@/lib/i18n/LocaleProvider'

type Props = {
  kind: 'empty' | 'error' | 'loading'
  title?: string
  body?: string
  actionHref?: string
  actionLabel?: string
  onRetry?: () => void
}

export default function HumanState({ kind, title, body, actionHref, actionLabel, onRetry }: Props) {
  const { locale, dict } = useLocale()
  const defaults = {
    empty: {
      title: locale === 'en' ? 'Nothing here yet' : 'اینجا هنوز چیزی نیست',
      body:
        locale === 'en'
          ? 'Start a short chat or a game — things will show up here.'
          : 'یه گفتگوی کوتاه یا یه بازی شروع کن — اینجا پر می‌شه.',
    },
    error: {
      title: locale === 'en' ? 'Something got tangled 😅' : 'اوه! یه چیزی قاطی کرد 😅',
      body:
        locale === 'en'
          ? 'Not your fault. Try once more?'
          : 'تقصیر تو نیست. یه‌بار دیگه امتحان کنیم؟',
    },
    loading: {
      title: locale === 'en' ? 'One moment…' : 'یه لحظه…',
      body:
        locale === 'en'
          ? 'Sorting your mind map bits 🧠✨'
          : 'دارم تکه‌های نقشه ذهنت رو مرتب می‌کنم 🧠✨',
    },
  }
  const d = defaults[kind]
  const t = title || d.title
  const b = body || d.body

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-6 text-center space-y-3 max-w-md mx-auto">
      <p className="text-2xl" aria-hidden>
        {kind === 'loading' ? '⏳' : kind === 'error' ? '🌀' : '🌱'}
      </p>
      <h3 className="font-semibold text-[var(--text)]">{t}</h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{b}</p>
      <div className="flex flex-wrap gap-2 justify-center pt-1">
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-primary px-4 py-2 text-sm">
            {locale === 'en' ? 'Try again' : 'دوباره'}
          </button>
        )}
        {actionHref && (
          <Link href={actionHref} className="btn-primary px-4 py-2 text-sm">
            {actionLabel || dict.start || (locale === 'en' ? 'Start' : 'شروع')}
          </Link>
        )}
      </div>
    </div>
  )
}
