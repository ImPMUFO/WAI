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
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-dark-950/50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧠</div>
            <div>
              <h1 className="text-xl font-bold text-white">نقشه‌کش دانش</h1>
              <p className="text-xs text-gray-400">Knowledge Mapper</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <motion.div
            className="text-center space-y-8"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-full">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span className="text-sm text-teal-300">نسخه آزمایشی ۱.۰</span>
              </div>

              <h2 className="heading-1 text-white leading-tight">
                نقشه‌کش
                <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent"> دانش </span>
                دیجیتالی شخصی
              </h2>

              <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                پلتفرم هوشمند یادگیری که دانش شما را نگاشت می‌کند و مسیر یادگیری شخصی‌سازی‌شده می‌سازد
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/start" className="btn-primary flex items-center justify-center gap-2 px-8 py-3 text-lg">
                شروع کنید
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp} className="pt-8">
              <div className="text-sm text-gray-400 mb-6">نقاط قوت اصلی:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: Brain, title: 'هوشمند', desc: 'ارزیابی تطبیقی با هوش مصنوعی' },
                  { icon: BookOpen, title: 'جامع', desc: 'پوشش عمیق مفاهیم و پیش‌نیازها' },
                  { icon: Zap, title: 'شخصی', desc: 'مسیر یادگیری مخصوص خودت' }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    variants={fadeInUp}
                    className="card text-center"
                  >
                    <item.icon className="w-8 h-8 mx-auto mb-3 text-emerald-400" />
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-400">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="heading-2 text-white mb-4">ویژگی‌های اصلی</h2>
            <p className="text-gray-400 text-lg">آنچه در این مسیر در انتظارت است</p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
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
                <feature.icon className="w-12 h-12 text-emerald-400 mb-4" />
                <h3 className="heading-3 text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="heading-2 text-white">آماده شروع مسیر؟</h2>
            <p className="text-xl text-gray-300">
              دانش خود را نگاشت کن و ببین دقیقاً کجا ایستاده‌ای و به کجا باید بروی
            </p>
            <Link href="/start" className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
              شروع ارزیابی
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-gray-400">
        <p>© ۱۴۰۵ نقشه‌کش دانش. تمامی حقوق محفوظ است.</p>
        <p className="text-sm mt-2">ساخته‌شده برای جویندگان معرفت</p>
      </footer>
    </main>
  )
}
