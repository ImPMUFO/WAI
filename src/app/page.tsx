'use client'

import { motion } from 'framer-motion'
import { Brain, BookOpen, Zap, Users, ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 rtl">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-dark-950/60 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="text-2xl sm:text-3xl">🧠</div>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white leading-tight">من کیستم؟</h1>
              <p className="text-[10px] sm:text-xs text-teal-400/80">پایگاه دانش</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-64 h-64 sm:w-80 sm:h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-32 -left-32 w-64 h-64 sm:w-80 sm:h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-28">
          <motion.div
            className="text-center space-y-6 sm:space-y-8"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="space-y-3 sm:space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-teal-500/10 border border-teal-500/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />
                <span className="text-xs sm:text-sm text-teal-300">نسخه آزمایشی ۱.۰</span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                من کیستم؟
                <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent"> پایگاه دانش</span>
              </h2>

              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed px-1">
                پلتفرم هوشمند یادگیری که دانش تو را نگاشت می‌کند و مسیر رشد شخصی‌ات را روشن می‌سازد
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex justify-center pt-2">
              <Link
                href="/start"
                className="btn-primary flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 text-base sm:text-lg w-full sm:w-auto max-w-xs"
              >
                شروع کنید
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp} className="pt-6 sm:pt-10">
              <div className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">نقاط قوت اصلی</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { icon: Brain, title: 'هوشمند', desc: 'ارزیابی تطبیقی با هوش مصنوعی' },
                  { icon: BookOpen, title: 'جامع', desc: 'پوشش عمیق مفاهیم و پیش‌نیازها' },
                  { icon: Zap, title: 'شخصی', desc: 'مسیر یادگیری مخصوص خودت' }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    variants={fadeInUp}
                    className="card text-center py-5 sm:py-6"
                  >
                    <item.icon className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2.5 sm:mb-3 text-emerald-400" />
                    <h3 className="font-semibold text-sm sm:text-base mb-1">{item.title}</h3>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-14 sm:py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-10 sm:mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">ویژگی‌های اصلی</h2>
            <p className="text-sm sm:text-base text-gray-400">آنچه در این مسیر در انتظارت است</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              {
                icon: Brain,
                title: 'ارزیابی تطبیقی',
                description: 'سیستم سؤال‌پرسی هوشمند که بر اساس دانش واقعی تو مسیرش را تغییر می‌دهد'
              },
              {
                icon: BookOpen,
                title: 'نگاشت دانش',
                description: 'نمای تعاملی از ساختار دانش، روابط مفاهیم و سرزمین‌های کشف‌نشده'
              },
              {
                icon: Zap,
                title: 'مدل ذهنی شخصی',
                description: 'مدل دیجیتالی از دانش تو که با هر گفت‌وگو به‌روز و دقیق‌تر می‌شود'
              },
              {
                icon: Users,
                title: 'مسیر یادگیری شخصی',
                description: 'پیشنهاد گام‌های بعدی بر اساس نقاط قوت، ضعف و اهداف تو'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="card"
              >
                <feature.icon className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 sm:py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4 sm:space-y-6"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">آماده شروع مسیر؟</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 leading-relaxed">
              دانش خود را نگاشت کن و ببین دقیقاً کجا ایستاده‌ای و به کجا باید بروی
            </p>
            <Link
              href="/start"
              className="btn-primary px-6 py-3 sm:px-8 sm:py-4 text-base sm:text-lg inline-flex items-center gap-2"
            >
              شروع ارزیابی
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 sm:py-12 text-center text-gray-400">
        <p className="text-sm sm:text-base">© ۱۴۰۵ من کیستم؟ پایگاه دانش</p>
        <p className="text-xs sm:text-sm mt-2 text-gray-500">ساخته‌شده برای جویندگان معرفت</p>
      </footer>
    </main>
  )
}
