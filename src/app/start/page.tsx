'use client'

import { motion } from 'framer-motion'
import { Brain, Code, BookOpen, Heart, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const domains = [
  {
    id: 'philosophy',
    title: 'فلسفه',
    description: 'منطق، اخلاق، متافیزیک، معرفت‌شناسی و فلسفه ذهن',
    icon: Brain,
    color: 'from-teal-500 to-emerald-600'
  },
  {
    id: 'programming',
    title: 'برنامه‌نویسی',
    description: 'الگوریتم، ساختار داده، مفاهیم پایه و تفکر محاسباتی',
    icon: Code,
    color: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'history',
    title: 'تاریخ',
    description: 'تاریخ ایران، جهان، اندیشه‌ها و تمدن‌ها',
    icon: BookOpen,
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'psychology',
    title: 'روان‌شناسی',
    description: 'شناخت، رفتار، شخصیت و روان‌شناسی شناختی',
    icon: Heart,
    color: 'from-rose-500 to-pink-600'
  },
]

export default function StartPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 rtl">
      <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            حوزه مورد نظرت را انتخاب کن
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            سیستم بر اساس انتخاب تو شروع به ارزیابی دانش و ساخت نقشه ذهنی‌ات می‌کند
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {domains.map((domain, index) => (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                href={`/assessment/${domain.id}`}
                className="w-full text-right card hover:border-teal-500/50 hover:bg-white/5 transition-all group block"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${domain.color} flex items-center justify-center mb-4`}>
                  <domain.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-teal-300 transition-colors">
                  {domain.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {domain.description}
                </p>
                <div className="mt-4 flex items-center gap-2 text-teal-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  شروع ارزیابی
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </main>
  )
}
