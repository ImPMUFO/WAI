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
      title: 'گفتگو با هوش مصنوعی',
      desc: 'با همراه دانا حرف بزن و دانش خودت را بسنج',
    },
    {
      href: '/map',
      icon: MapIcon,
      title: 'نقشه ذهنی',
      desc: 'جایگاه دانش و مسیر رشدت را ببین',
    },
    {
      href: '/play',
      icon: Gamepad2,
      title: 'بازی‌ها',
      desc: 'کوئیز و چالش روزانه برای XP و سطح',
    },
    {
      href: '/world',
      icon: Globe2,
      title: 'گفتگوی جهانی',
      desc: 'با بقیه کاربران گپ بزن (پیام‌ها ۲۴ساعته)',
    },
  ]

  return (
    <main key={locale} className="min-h-screen" dir={dir} style={{ color: 'var(--text)' }}>
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
            className="text-center space-y-4 sm:space-y-5 mb-10 sm:mb-12"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.p variants={fadeInUp} className="text-sm text-[var(--accent)]">
              {dict.brandTag}
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-2xl sm:text-4xl font-bold leading-tight">
              {dict.brandName}
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-sm sm:text-base text-[var(--muted)] max-w-xl mx-auto leading-relaxed">
              گفتگو کن، نقشه ذهنی‌ات را ببین، بازی کن و با دیگران در گفتگوی جهانی همراه شو.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card !p-4 sm:!p-5 flex items-start gap-3 hover:border-[var(--accent)]/40 transition group"
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
            حساب کاربری، ارتباط با ما، پوسته و زبان را از منوی سه‌خطی بالا باز کن.
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
