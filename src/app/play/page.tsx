'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Gamepad2, CheckCircle2, XCircle } from 'lucide-react'
import GamificationBar from '@/components/GamificationBar'
import { onQuizFinished } from '@/lib/gamification'

type QuizItem = {
  id: string
  domain: string
  type: 'tf' | 'mc' | 'fill'
  question: string
  options?: string[]
  answer: string
  explain: string
}

const BANK: QuizItem[] = [
  {
    id: 'p1',
    domain: 'philosophy',
    type: 'tf',
    question: 'معرفت‌شناسی شاخه‌ای از فلسفه است که دربارهٔ چیستی معرفت می‌پرسد.',
    answer: 'درست',
    explain: 'بله؛ معرفت‌شناسی (epistemology) دربارهٔ چیستی و امکان دانش است.',
  },
  {
    id: 'p2',
    domain: 'philosophy',
    type: 'mc',
    question: 'کدام گزینه بیشتر به «منطق» مربوط است؟',
    options: ['استدلال معتبر', 'سبک ادبی', 'قیمت کالا', 'ژنتیک'],
    answer: 'استدلال معتبر',
    explain: 'منطق قواعد استدلال صحیح را بررسی می‌کند.',
  },
  {
    id: 'h1',
    domain: 'history',
    type: 'mc',
    question: 'برای فهم یک رویداد تاریخی، کدام مهم‌تر است؟',
    options: ['فقط تاریخ دقیق', 'علت و زمینه', 'نام افراد معروف فقط', 'رنگ پرچم'],
    answer: 'علت و زمینه',
    explain: 'تاریخ فقط فهرست تاریخ‌ها نیست؛ علت‌ها و بستر اهمیت دارد.',
  },
  {
    id: 'h2',
    domain: 'history',
    type: 'tf',
    question: 'تطبیق شخصیت‌ها با رویدادها یکی از راه‌های یادگیری تاریخ است.',
    answer: 'درست',
    explain: 'ارتباط‌دادن افراد و رخدادها حافظهٔ تاریخی را تقویت می‌کند.',
  },
  {
    id: 'm1',
    domain: 'math',
    type: 'mc',
    question: 'اگر a=2 و b=3، مقدار a+b چند است؟',
    options: ['5', '6', '1', '23'],
    answer: '5',
    explain: 'جمع ساده: ۲+۳=۵.',
  },
  {
    id: 'phy1',
    domain: 'physics',
    type: 'tf',
    question: 'نیرو می‌تواند سرعت یا جهت حرکت را تغییر دهد.',
    answer: 'درست',
    explain: 'طبق مکانیک کلاسیک، نیرو با شتاب مرتبط است.',
  },
  {
    id: 'c1',
    domain: 'chemistry',
    type: 'mc',
    question: 'آب از چه عناصری ساخته شده؟',
    options: ['هیدروژن و اکسیژن', 'کربن و نیتروژن', 'آهن و مس', 'سدیم و کلر'],
    answer: 'هیدروژن و اکسیژن',
    explain: 'فرمول آب H₂O است.',
  },
  {
    id: 'r1',
    domain: 'religion',
    type: 'tf',
    question: 'در مطالعهٔ دین، تمایز بین باور، دلیل و تجربه مفید است.',
    answer: 'درست',
    explain: 'این تمایز گفتگو را دقیق‌تر و عمیق‌تر می‌کند.',
  },
  {
    id: 'e1',
    domain: 'ethics',
    type: 'mc',
    question: 'در اخلاق، کدام سؤال محوری‌تر است؟',
    options: ['چه چیزی ارزشمند/درست است؟', 'قیمت دلار چند است؟', 'رنگ محبوب من چیست؟', 'ساعت چند است؟'],
    answer: 'چه چیزی ارزشمند/درست است؟',
    explain: 'اخلاق دربارهٔ ارزش و درستی عمل می‌پرسد.',
  },
  {
    id: 'prog1',
    domain: 'programming',
    type: 'fill',
    question: 'ساختاری که داده را به‌صورت کلید-مقدار نگه می‌دارد در بسیاری زبان‌ها .... نام دارد. (دیکشنری/آبجکت/مپ)',
    answer: 'دیکشنری',
    explain: 'نام‌ها متفاوت است اما مفهوم map/dict/object شبیه است.',
  },
  {
    id: 'psy1',
    domain: 'psychology',
    type: 'tf',
    question: 'سوگیری شناختی می‌تواند تصمیم‌گیری را منحرف کند.',
    answer: 'درست',
    explain: 'روان‌شناسی شناختی این سوگیری‌ها را مطالعه می‌کند.',
  },
]

const domainLabel: Record<string, string> = {
  philosophy: 'فلسفه',
  history: 'تاریخ',
  math: 'ریاضی',
  physics: 'فیزیک',
  chemistry: 'شیمی',
  religion: 'دین',
  ethics: 'اخلاق',
  programming: 'برنامه‌نویسی',
  psychology: 'روان‌شناسی',
}

export default function PlayPage() {
  const [domain, setDomain] = useState<string>('all')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string>('')
  const [fill, setFill] = useState('')
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null)
  const [score, setScore] = useState({ ok: 0, total: 0 })
  const [done, setDone] = useState(false)

  const items = useMemo(() => {
    const list = domain === 'all' ? BANK : BANK.filter((q) => q.domain === domain)
    return list.length ? list : BANK
  }, [domain])

  const q = items[index % items.length]

  const submit = () => {
    if (!q || feedback) return
    const userAns =
      q.type === 'fill' ? fill.trim() : selected.trim()
    if (!userAns) return
    const ok =
      q.type === 'fill'
        ? userAns.includes(q.answer) || q.answer.includes(userAns)
        : userAns === q.answer
    setFeedback(ok ? 'ok' : 'bad')
    setScore((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }))
  }

  const next = () => {
    if (score.total > 0 && score.total % 5 === 0) {
      onQuizFinished(score.ok / Math.max(1, score.total))
    }
    setFeedback(null)
    setSelected('')
    setFill('')
    if (index + 1 >= items.length) {
      onQuizFinished(score.ok / Math.max(1, score.total + (feedback === 'ok' ? 0 : 0)))
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
  }

  const restart = () => {
    setIndex(0)
    setScore({ ok: 0, total: 0 })
    setFeedback(null)
    setSelected('')
    setFill('')
    setDone(false)
  }

  return (
    <main className="min-h-screen rtl px-4 py-8" style={{ color: 'var(--text)' }}>
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h1 className="text-xl font-bold">بازی‌ها و مأموریت‌ها</h1>
              <p className="text-xs text-[var(--muted)]">یادگیری با چالش کوتاه</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] inline-flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            خانه
          </Link>
        </div>

        <GamificationBar />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setDomain('all')
              restart()
            }}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              domain === 'all' ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'
            }`}
          >
            همه
          </button>
          {Object.keys(domainLabel).map((d) => (
            <button
              key={d}
              onClick={() => {
                setDomain(d)
                restart()
              }}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                domain === d ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'
              }`}
            >
              {domainLabel[d]}
            </button>
          ))}
        </div>

        {done ? (
          <div className="card space-y-3 text-center">
            <h2 className="text-lg font-semibold">پایان دور</h2>
            <p className="text-[var(--muted)]">
              امتیاز این دور: {score.ok} از {score.total}
            </p>
            <button onClick={restart} className="btn-primary px-5 py-2">
              دوباره
            </button>
          </div>
        ) : (
          <div className="card space-y-4">
            <div className="flex justify-between text-xs text-[var(--muted)]">
              <span>{domainLabel[q.domain] || q.domain}</span>
              <span>
                سؤال {index + 1}/{items.length} · درست {score.ok}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold leading-relaxed">{q.question}</h2>

            {q.type === 'tf' && (
              <div className="flex gap-2">
                {['درست', 'نادرست'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelected(opt)}
                    disabled={!!feedback}
                    className={`flex-1 py-3 rounded-xl border ${
                      selected === opt
                        ? 'border-[var(--accent)] bg-[var(--accent)]/15'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'mc' && q.options && (
              <div className="grid gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelected(opt)}
                    disabled={!!feedback}
                    className={`text-right px-4 py-3 rounded-xl border ${
                      selected === opt
                        ? 'border-[var(--accent)] bg-[var(--accent)]/15'
                        : 'border-[var(--border)]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'fill' && (
              <input
                value={fill}
                onChange={(e) => setFill(e.target.value)}
                disabled={!!feedback}
                placeholder="پاسخ را بنویس..."
                className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
                style={{ color: 'var(--text)' }}
              />
            )}

            {feedback && (
              <div
                className={`rounded-xl p-3 text-sm border ${
                  feedback === 'ok'
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : 'border-rose-400/40 bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 font-medium">
                  {feedback === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {feedback === 'ok' ? 'درست!' : 'نادرست'}
                </div>
                <p className="text-[var(--muted)] leading-relaxed">{q.explain}</p>
              </div>
            )}

            <div className="flex gap-2">
              {!feedback ? (
                <button onClick={submit} className="btn-primary px-5 py-2.5">
                  ثبت پاسخ
                </button>
              ) : (
                <button onClick={next} className="btn-primary px-5 py-2.5">
                  بعدی
                </button>
              )}
              <Link href="/start" className="btn-secondary px-4 py-2.5">
                گفتگو
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
