'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import SiteMenu from '@/components/SiteMenu'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { onQuizQuestionAnswered, questionFingerprint, loadGame } from '@/lib/gamification'

type Q = { id: string; q: string; options: string[]; answer: string }

const BANK: Q[] = [
  { id: 'd1', q: 'کدام گزینه بیشتر به «استدلال» نزدیک است؟', options: ['حفظ طوطی‌وار', 'نتیجه‌گیری از مقدمه', 'حدس تصادفی', 'تکرار شعار'], answer: 'نتیجه‌گیری از مقدمه' },
  { id: 'd2', q: 'برای یادگیری پایدار معمولاً کدام بهتر است؟', options: ['فقط خواندن', 'تمرین با فاصله', 'یک‌بار حفظ فشرده', 'نادیده گرفتن اشتباه'], answer: 'تمرین با فاصله' },
  { id: 'd3', q: 'سوءبرداشت یعنی…', options: ['نمی‌دانمِ صادقانه', 'فهم اشتباه با اطمینان نسبی', 'خستگی', 'کمبود زمان'], answer: 'فهم اشتباه با اطمینان نسبی' },
]

function code() { return Math.random().toString(36).slice(2, 8).toUpperCase() }

export default function DuelPage() {
  const { dir, locale } = useLocale()
  const [room, setRoom] = useState('')
  const [joined, setJoined] = useState(false)
  const [you, setYou] = useState(0)
  const [rival, setRival] = useState(0)
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(false)
  const qs = useMemo(() => BANK, [])
  const answered = useMemo(() => new Set(loadGame().answeredQuestions || []), [joined, done, idx])

  const start = () => {
    if (!room) setRoom(code())
    setJoined(true)
    setYou(0)
    setRival(0)
    setIdx(0)
    setDone(false)
  }

  const answer = (opt: string) => {
    if (done) return
    const q = qs[idx]
    const id = questionFingerprint(q.q)
    if (answered.has(id)) {
      setIdx((i) => (i + 1 >= qs.length ? i : i + 1))
      return
    }
    const ok = opt === q.answer
    if (ok) setYou((y) => y + 1)
    if (Math.random() > 0.45) setRival((r) => r + 1)

    onQuizQuestionAnswered(id, ok, { domain: 'general', xpCorrect: 4, xpWrong: 1 })

    if (idx + 1 >= qs.length) setDone(true)
    else setIdx((i) => i + 1)
  }

  return (
    <main className="min-h-screen" dir={dir} style={{ color: 'var(--text)' }}>
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] backdrop-blur bg-[color-mix(in_srgb,var(--bg0)_80%,transparent)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-sm">{locale === 'en' ? 'Duel quiz' : 'کوییز دونفره'}</h1>
          <SiteMenu />
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          {locale === 'en' ? 'Local duel on one device.' : 'رقابت محلی روی یک دستگاه.'}
        </p>

        {!joined ? (
          <div className="card space-y-3">
            <input className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())} placeholder="ABC123" />
            <button type="button" className="btn-primary w-full py-2.5" onClick={start}>{locale === 'en' ? 'Start duel' : 'شروع رقابت'}</button>
          </div>
        ) : done ? (
          <div className="card text-center space-y-2">
            <p className="font-semibold text-lg">
              {you === rival ? (locale === 'en' ? 'Draw!' : 'مساوی!') : you > rival ? (locale === 'en' ? 'You win 🎉' : 'تو بردی 🎉') : (locale === 'en' ? 'Rival wins' : 'حریف برد')}
            </p>
            <p className="text-sm">{locale === 'en' ? 'You' : 'تو'}: {you} · {locale === 'en' ? 'Rival' : 'حریف'}: {rival}</p>
            <button type="button" className="btn-primary px-4 py-2" onClick={start}>{locale === 'en' ? 'Again' : 'دوباره'}</button>
          </div>
        ) : (
          <div className="card space-y-3">
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>{locale === 'en' ? 'You' : 'تو'}: {you}</span>
              <span>{idx + 1}/{qs.length}</span>
              <span>{locale === 'en' ? 'Rival' : 'حریف'}: {rival}</span>
            </div>
            <p className="font-medium text-sm leading-relaxed">{qs[idx].q}</p>
            <div className="space-y-2">
              {qs[idx].options.map((o) => (
                <button key={o} type="button" onClick={() => answer(o)} className="w-full text-right rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm hover:border-[var(--accent)]/50">
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}

        <Link href="/play" className="text-sm text-[var(--accent)]">← {locale === 'en' ? 'Back to games' : 'بازگشت به بازی‌ها'}</Link>
      </div>
    </main>
  )
}
