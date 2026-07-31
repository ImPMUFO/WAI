'use client'

import { motion } from 'framer-motion'
import { Brain, BookOpen, Zap, Users, ArrowRight, Github, Sparkles } from 'lucide-react'
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
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <motion.div
            className="text-center space-y-8"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">🎉 نسخه Beta 1.0</span>
              </div>

              <h2 className="heading-1 text-white leading-tight">
                نقشه‌کش
                <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"> دانش </span>
                دیجیتالی شخصی
              </h2>

              <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                پلتفرم هوشمند یادگیری که دانش شما را نگاشت می‌کند و مسیر یادگیری‌ای شخصی‌سازی‌شده برای شما می‌سازد
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary flex items-center justify-center gap-2 px-8 py-3 text-lg">
                شروع کنید
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>

            <motion.div variants={fadeInUp} className="pt-8">
              <div className="text-sm text-gray-400 mb-6">نقاط قوت اصلی:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: Brain, title: 'هوشمند', desc: 'AI متطابق' },
                  { icon: BookOpen, title: 'جامع', desc: 'بسیار مسائل' },
                  { icon: Zap, title: 'سریع', desc: 'Performance بالا' }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    variants={fadeInUp}
                    className="card text-center"
                  >
                    <item.icon className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
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
            <p className="text-gray-400 text-lg">آنچه شما را منتظر می‌کند</p>
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
                title: 'ارزیابی تطابقی',
                description: 'سیستم سؤال‌پرسی هوشمند که بر اساس دانش شما تغییر می‌کند'
              },
              {
                icon: BookOpen,
                title: 'نگاشت دانش',
                description: 'نمای تعاملی از ساختار دانش و روابط بین مفاهیم'
              },
              {
                icon: Zap,
                title: 'Digital Twin',
                description: 'مدل دیجیتالی از دانش شما که مستمر به‌روز می‌شود'
              },
              {
                icon: Users,
                title: 'توصیه‌های شخصی',
                description: 'منابع یادگیری انتخاب‌شده‌ی شخصی برای شما'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                className="card"
              >
                <feature.icon className="w-12 h-12 text-cyan-400 mb-4" />
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
            <h2 className="heading-2 text-white">آماده برای شروع؟</h2>
            <p className="text-xl text-gray-300">
              به جامعه‌ی یادگیرندگان هوشمند بپیوندید و دانش خود را نگاشت کنید
            </p>
            <button className="btn-primary px-8 py-4 text-lg inline-flex items-center gap-2">
              درخواست دسترسی
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-gray-400">
        <p>© 2024 نقشه‌کش دانش. تمام حقوق محفوظ است.</p>
        <p className="text-sm mt-2">ایجادشده با ❤️ برای یادگیرندگان</p>
      </footer>
    </main>
  )
}
