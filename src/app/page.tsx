'use client'

import { motion } from 'framer-motion'
import { Brain, Map as MapIcon, Gamepad2, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLocale } from '@/lib/i18n/LocaleProvider'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

export default function Home() {
  const { locale, dict, dir } = useLocale()

  return (
    <main className="min-h-screen" dir={dir} style={{ color: 'var(--text)' }}>
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg0)_70%,transparent)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="text-2xl sm:text-3xl shrink-0">🧠</div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold leading-tight truncate">{dict.brandName}</h1>
              <p className="text-[10px] sm:text-xs text-[var(--accent)]/90">
                {dict.brandTag} · {dict.brandSub}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Link href="/auth" className="text-xs sm:text-sm text-[var(--muted)] hover:text-[var(--accent)] px-2">
              {dict.login}
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl bg-[var(--accent)]/10" />
          <div className="absolute -bottom-32 -left-32 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl bg-[var(--accent2)]/10" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-28">
          <motion.div
            className="text-center space-y-6 sm:space-y-8"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="space-y-3 sm:space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[var(--border)] bg-[var(--accent-dim)]">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--accent)]" />
                <span className="text-xs sm:text-sm text-[var(--accent)]">{dict.beta}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {dict.brandTag}
                <br />
                <span className="text-[var(--accent)]">{dict.brandSub}</span>
              </h2>

              <p className="text-base sm:text-lg md:text-xl text-[var(--muted)] max-w-2xl mx-auto leading-relaxed px-1">
                {dict.ctaBody}
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/start"
                className="btn-primary flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 text-base sm:text-lg"
              >
                {dict.start}
                <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
              </Link>
              <Link href="/map" className="btn-secondary px-5 py-3 text-sm sm:text-base">
                {dict.mindMap}
              </Link>
              <Link href="/play" className="btn-secondary px-5 py-3 text-sm sm:text-base">
                {dict.games}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 sm:py-16 border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl sm:text-2xl font-bold mb-8">{dict.featuresTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Brain, title: dict.feature1Title, desc: dict.feature1Desc },
              { icon: MapIcon, title: dict.feature2Title, desc: dict.feature2Desc },
              { icon: Gamepad2, title: dict.feature3Title, desc: dict.feature3Desc },
            ].map((item, idx) => (
              <div key={idx} className="card text-center py-6">
                <item.icon className="w-8 h-8 mx-auto mb-3 text-[var(--accent)]" />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
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
