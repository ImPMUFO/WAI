'use client'

import { motion } from 'framer-motion'
import { Brain, Map as MapIcon, Gamepad2, Globe2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import SiteMenu from '@/components/SiteMenu'
import { useLocale } from '@/lib/i18n/LocaleProvider'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

export default function Home() {
  const { locale, dict, dir } = useLocale()

  const primary = [
    {
      href: '/start',
      icon: Brain,
      title: dict.aiChatTitle || dict.chat,
      desc: dict.aiChatDesc || '',
    },
    {
      href: '/map',
      icon: MapIcon,
      title: dict.mindMap,
      desc: dict.mapCardDesc || '',
    },
    {
      href: '/play',
      icon: Gamepad2,
      title: dict.games,
      desc: dict.gamesCardDesc || '',
    },
    {
      href: '/world',
      icon: Globe2,
      title: dict.worldChatTitle || 'World',
      desc: dict.worldChatDesc || '',
    },
  ]

  return (
    <main key={locale} className="min-h-screen" dir={dir} style={{ color: 'var(--text)' }}>
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg0)_70%,transparent)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="text-2xl sm:text-3xl shrink-0">🧠</div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold leading-tight truncate">{dict.brandName}</h1>
              <p className="text-[10px] sm:text-xs text-[var(--accent)]/90">
                {dict.brandTag} · {dict.brandSub}
              </p>
            </div>
          </div>
          <SiteMenu />
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl bg-[var(--accent)]/10" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl bg-[var(--accent2)]/10" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <motion.div
            className="text-center space-y-4 sm:space-y-5 mb-8 sm:mb-10"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.p variants={fadeInUp} className="text-sm text-[var(--accent)] font-medium">
              {dict.brandTag} · {dict.brandSub}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight">
              {dict.brandName}
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-sm sm:text-lg text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
              {dict.homeLead}
            </motion.p>
            <motion.div variants={fadeInUp} className="flex flex-col items-center gap-2 pt-1">
              <Link
                href="/start"
                className="btn-primary px-8 py-3.5 text-base sm:text-lg font-bold shadow-lg shadow-[var(--accent)]/20 hover:scale-[1.02] active:scale-[0.98] transition"
              >
                {(dict as any).primaryCta || dict.start}
              </Link>
              <p className="text-[11px] sm:text-xs text-[var(--muted)]">
                {(dict as any).primaryCtaHint || dict.ctaBody}
              </p>
            </motion.div>
            <motion.div
              variants={fadeInUp}
              className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-[var(--muted)] pt-2"
            >
              <span className="opacity-70">{(dict as any).journeyLabel || 'مسیرت'}</span>
              <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
                💬 {(dict as any).journeyStep1 || 'گفتگو'}
              </span>
              <span className="opacity-40">→</span>
              <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
                🔍 {(dict as any).journeyStep2 || 'کشف'}
              </span>
              <span className="opacity-40">→</span>
              <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
                🗺️ {(dict as any).journeyStep3 || 'نقشه'}
              </span>
              <span className="opacity-40">→</span>
              <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
                ⬆️ {(dict as any).journeyStep4 || 'پیشرفت'}
              </span>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card !p-3.5 sm:!p-5 flex items-start gap-2.5 sm:gap-3 hover:border-[var(--accent)]/40 transition group active:scale-[0.99]"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="font-semibold text-sm sm:text-base group-hover:text-[var(--accent)] transition">
                    {item.title}
                  </p>
                  <p className="text-xs sm:text-sm text-[var(--muted)] mt-1 leading-relaxed">{item.desc}</p>
                </div>
                <ArrowLeft className={`w-4 h-4 text-[var(--muted)] shrink-0 mt-1 ${dir === 'ltr' ? 'rotate-180' : ''}`} />
              </Link>
            ))}
          </div>

          <p className="text-center text-[11px] text-[var(--muted)] mt-8 leading-relaxed">
            {dict.homeHint}
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-8 text-center text-[var(--muted)]">
        <p className="text-sm font-medium">{dict.brandName}</p>
        <p className="text-xs mt-1 opacity-70">
          {dict.brandTag} · {dict.brandSub}
        </p>
      </footer>
    </main>
  )
}
