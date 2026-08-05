'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useLocale } from '@/lib/i18n/useLocale'
import { localeMeta } from '@/lib/i18n/dictionaries'

const domains = [
  { id: 'general', title: { fa: 'گفت‌وگوی آزاد', en: 'Open talk', ar: 'حوار حر' }, desc: { fa: 'هر موضوعی از دانش', en: 'Any knowledge topic', ar: 'أي موضوع معرفي' }, emoji: '🌐' },
  { id: 'philosophy', title: { fa: 'فلسفه', en: 'Philosophy', ar: 'فلسفة' }, desc: { fa: 'منطق، وجود، معرفت', en: 'Logic, being, knowledge', ar: 'منطق ووجود ومعرفة' }, emoji: '🧠' },
  { id: 'religion', title: { fa: 'دین و الهیات', en: 'Religion', ar: 'دين ولاهوت' }, desc: { fa: 'ایمان، کلام، ادیان', en: 'Faith and theology', ar: 'إيمان وعلم كلام' }, emoji: '🕌' },
  { id: 'ethics', title: { fa: 'اخلاق', en: 'Ethics', ar: 'أخلاق' }, desc: { fa: 'خیر، مسئولیت، ارزش', en: 'Good, duty, value', ar: 'خير ومسؤولية' }, emoji: '⚖️' },
  { id: 'programming', title: { fa: 'برنامه‌نویسی', en: 'Programming', ar: 'برمجة' }, desc: { fa: 'الگوریتم و تفکر', en: 'Algorithms & thinking', ar: 'خوارزميات وتفكير' }, emoji: '💻' },
  { id: 'math', title: { fa: 'ریاضی', en: 'Math', ar: 'رياضيات' }, desc: { fa: 'جبر، حسابان، استدلال', en: 'Algebra & reasoning', ar: 'جبر واستدلال' }, emoji: '📐' },
  { id: 'physics', title: { fa: 'فیزیک', en: 'Physics', ar: 'فيزياء' }, desc: { fa: 'مکانیک تا کوانتوم', en: 'Mechanics to quantum', ar: 'من الميكانيكا للكم' }, emoji: '⚛️' },
  { id: 'chemistry', title: { fa: 'شیمی', en: 'Chemistry', ar: 'كيمياء' }, desc: { fa: 'ماده و واکنش‌ها', en: 'Matter & reactions', ar: 'مادة وتفاعلات' }, emoji: '🧪' },
  { id: 'biology', title: { fa: 'زیست‌شناسی', en: 'Biology', ar: 'أحياء' }, desc: { fa: 'حیات و ژنتیک', en: 'Life & genetics', ar: 'حياة ووراثة' }, emoji: '🧬' },
  { id: 'history', title: { fa: 'تاریخ', en: 'History', ar: 'تاريخ' }, desc: { fa: 'ایران و جهان', en: 'Iran & the world', ar: 'إيران والعالم' }, emoji: '📜' },
  { id: 'psychology', title: { fa: 'روان‌شناسی', en: 'Psychology', ar: 'علم نفس' }, desc: { fa: 'ذهن و رفتار', en: 'Mind & behavior', ar: 'عقل وسلوك' }, emoji: '🧩' },
  { id: 'literature', title: { fa: 'ادبیات', en: 'Literature', ar: 'أدب' }, desc: { fa: 'زبان و روایت', en: 'Language & narrative', ar: 'لغة وسرد' }, emoji: '📚' },
  { id: 'economics', title: { fa: 'اقتصاد', en: 'Economics', ar: 'اقتصاد' }, desc: { fa: 'بازار و تصمیم', en: 'Markets & choice', ar: 'سوق وقرار' }, emoji: '📈' },
]

export default function StartPage() {
  const { locale, dict } = useLocale()
  const dir = localeMeta[locale].dir

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12" dir={dir} style={{ color: 'var(--text)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{dict.chooseDomain}</h1>
            <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{dict.chooseDomainHint}</p>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm shrink-0">
            <Link href="/map" className="text-[var(--accent)] hover:opacity-80">
              {dict.mindMap}
            </Link>
            <Link href="/" className="text-[var(--muted)] hover:opacity-80 inline-flex items-center gap-1">
              <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              {dict.home}
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
                <h2 className="font-semibold text-base mb-1">{d.title[locale]}</h2>
                <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">{d.desc[locale]}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  )
}
