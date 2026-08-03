'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

const domains = [
  { id: 'general', title: 'گفت‌وگوی آزاد', desc: 'هر موضوعی از دانش', emoji: '🌐' },
  { id: 'philosophy', title: 'فلسفه', desc: 'منطق، وجود، معرفت', emoji: '🧠' },
  { id: 'religion', title: 'دین و الهیات', desc: 'ایمان، کلام، ادیان', emoji: '🕌' },
  { id: 'ethics', title: 'اخلاق', desc: 'خیر، مسئولیت، ارزش', emoji: '⚖️' },
  { id: 'programming', title: 'برنامه‌نویسی', desc: 'الگوریتم و تفکر محاسباتی', emoji: '💻' },
  { id: 'math', title: 'ریاضی', desc: 'جبر، حسابان، استدلال', emoji: '📐' },
  { id: 'physics', title: 'فیزیک', desc: 'مکانیک تا کوانتوم', emoji: '⚛️' },
  { id: 'chemistry', title: 'شیمی', desc: 'ماده و واکنش‌ها', emoji: '🧪' },
  { id: 'biology', title: 'زیست‌شناسی', desc: 'حیات، ژنتیک، بدن', emoji: '🧬' },
  { id: 'history', title: 'تاریخ', desc: 'ایران و جهان', emoji: '📜' },
  { id: 'psychology', title: 'روان‌شناسی', desc: 'ذهن، رفتار، شخصیت', emoji: '🧩' },
  { id: 'literature', title: 'ادبیات', desc: 'زبان، روایت، نقد', emoji: '📚' },
  { id: 'economics', title: 'اقتصاد', desc: 'بازار، نهاد، تصمیم', emoji: '📈' },
]

export default function StartPage() {
  return (
    <main className="min-h-screen rtl px-4 py-8 sm:py-12" style={{ color: 'var(--text)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">از کجا شروع می‌کنی؟</h1>
            <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
              یک حوزه را انتخاب کن. همه گفت‌وگوها روی <span className="text-[var(--accent)]">یک نقشه ذهن واحد</span> جمع می‌شوند.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm">
            <Link href="/map" className="text-[var(--accent)] hover:opacity-80">
              نقشه کامل ذهن
            </Link>
            <Link href="/" className="text-[var(--muted)] hover:opacity-80 inline-flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              خانه
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {domains.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                href={`/assessment/${d.id}`}
                className="card block h-full hover:border-[var(--accent)]/40 transition-colors"
              >
                <div className="text-2xl mb-2">{d.emoji}</div>
                <h2 className="font-semibold text-base mb-1">{d.title}</h2>
                <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">{d.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  )
}
