'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Gamepad2, CheckCircle2, XCircle, Timer, Trophy, Zap } from 'lucide-react'
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
  { id: 'p1', domain: 'philosophy', type: 'tf', question: 'معرفت‌شناسی دربارهٔ چیستی و امکان معرفت می‌پرسد.', answer: 'درست', explain: 'معرفت‌شناسی یکی از شاخه‌های اصلی فلسفه است.' },
  { id: 'p2', domain: 'philosophy', type: 'mc', question: 'کدام بیشتر به منطق مربوط است؟', options: ['استدلال معتبر', 'سبک ادبی', 'قیمت کالا', 'ژنتیک'], answer: 'استدلال معتبر', explain: 'منطق قواعد استدلال درست را بررسی می‌کند.' },
  { id: 'h1', domain: 'history', type: 'mc', question: 'برای فهم رویداد تاریخی چه چیزی مهم‌تر است؟', options: ['فقط تاریخ دقیق', 'علت و زمینه', 'فقط نام افراد', 'رنگ پرچم'], answer: 'علت و زمینه', explain: 'علت‌ها و بستر از فهرست تاریخ‌ها مهم‌ترند.' },
  { id: 'h2', domain: 'history', type: 'tf', question: 'تطبیق شخصیت‌ها با رویدادها به یادگیری تاریخ کمک می‌کند.', answer: 'درست', explain: 'ارتباط افراد و رخدادها حافظه را قوی می‌کند.' },
  { id: 'm1', domain: 'math', type: 'mc', question: 'اگر a=۲ و b=۳، مقدار a+b؟', options: ['۵', '۶', '۱', '۲۳'], answer: '۵', explain: '۲+۳=۵' },
  { id: 'm2', domain: 'math', type: 'fill', question: 'نصف عدد ۱۰ چند است؟ (فقط عدد)', answer: '۵', explain: '۱۰÷۲=۵' },
  { id: 'phy1', domain: 'physics', type: 'tf', question: 'نیرو می‌تواند سرعت یا جهت حرکت را تغییر دهد.', answer: 'درست', explain: 'نیرو با تغییر حرکت مرتبط است.' },
  { id: 'c1', domain: 'chemistry', type: 'mc', question: 'آب از چه عناصری ساخته شده؟', options: ['هیدروژن و اکسیژن', 'کربن و نیتروژن', 'آهن و مس', 'سدیم و کلر'], answer: 'هیدروژن و اکسیژن', explain: 'فرمول آب H₂O است.' },
  { id: 'r1', domain: 'religion', type: 'tf', question: 'تمایز بین باور، دلیل و تجربه در مطالعه دین مفید است.', answer: 'درست', explain: 'این تمایز گفتگو را دقیق‌تر می‌کند.' },
  { id: 'e1', domain: 'ethics', type: 'mc', question: 'سؤال محوری اخلاق کدام است؟', options: ['چه باید کرد؟', 'هوا چند درجه است؟', 'رنگ دیوار چیست؟', 'ساعت چند است؟'], answer: 'چه باید کرد؟', explain: 'اخلاق درباره خوبی و مسئولیت است.' },
  { id: 'pr1', domain: 'programming', type: 'mc', question: 'کدام مفهوم برای ذخیره جفت کلید-مقدار رایج است؟', options: ['دیکشنری/آبجکت', 'فقط عدد صحیح', 'فقط رشته خالی', 'پشته سخت‌افزاری'], answer: 'دیکشنری/آبجکت', explain: 'map و dict و object مفهوم مشابه‌اند.' },
  { id: 'psy1', domain: 'psychology', type: 'tf', question: 'سوگیری شناختی می‌تواند تصمیم‌گیری را منحرف کند.', answer: 'درست', explain: 'روان‌شناسی شناختی این خطاها را مطالعه می‌کند.' },
  { id: 'bio1', domain: 'biology', type: 'mc', question: 'واحد پایه وراثت معمولاً چیست؟', options: ['ژن', 'سنگ', 'بایت', 'وات'], answer: 'ژن', explain: 'ژن حامل اطلاعات وراثتی است.' },
  { id: 'lit1', domain: 'literature', type: 'tf', question: 'در خواندن ادبی، توجه به فرم و معنا هر دو مفید است.', answer: 'درست', explain: 'ساختار متن هم مثل احساس مهم است.' },
  { id: 'ec1', domain: 'economics', type: 'mc', question: 'ایده کمیابی بیشتر به چه اشاره دارد؟', options: ['منابع محدود و انتخاب', 'بی‌نهایت بودن همه چیز', 'فقط چاپ پول', 'حذف کامل نیاز'], answer: 'منابع محدود و انتخاب', explain: 'اقتصاد با انتخاب در محدودیت سروکار دارد.' },
]

const STAGE_SIZE = 5
const TIME_PER_Q = 20
const BEST_KEY = 'waima_play_best'

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Phase = 'ready' | 'playing' | 'feedback' | 'stageClear' | 'done'

export default function PlayPage() {
  const { dict, dir } = useLocale()

  const [deck, setDeck] = useState<QuizItem[]>([])
  const [index, setIndex] = useState(0)
  const [stage, setStage] = useState(1)
  const [phase, setPhase] = useState<Phase>('ready')
  const [answer, setAnswer] = useState('')
  const [correctCount, setCorrectCount] = useState(0)
  const [stageCorrect, setStageCorrect] = useState(0)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [seconds, setSeconds] = useState(TIME_PER_Q)
  const [best, setBest] = useState(0)
  const [combo, setCombo] = useState(0)

  const totalStages = useMemo(() => Math.max(1, Math.ceil(BANK.length / STAGE_SIZE)), [])
  const current = deck[index]

  useEffect(() => {
    try {
      const b = Number(localStorage.getItem(BEST_KEY) || '0')
      if (!Number.isNaN(b)) setBest(b)
    } catch {}
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    setSeconds(TIME_PER_Q)
    const t = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(t)
          submitAnswer(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index])

  const startRun = () => {
    setDeck(shuffle(BANK))
    setIndex(0)
    setStage(1)
    setCorrectCount(0)
    setStageCorrect(0)
    setCombo(0)
    setAnswer('')
    setLastCorrect(null)
    setPhase('playing')
  }

  const submitAnswer = (timeout = false) => {
    if (!current || phase !== 'playing') return
    const userAns = timeout ? '' : answer.trim()
    const ok = !timeout && userAns === current.answer
    setLastCorrect(ok)
    if (ok) {
      setCorrectCount((c) => c + 1)
      setStageCorrect((c) => c + 1)
      setCombo((c) => c + 1)
    } else setCombo(0)
    setPhase('feedback')
  }

  const next = () => {
    const nextIndex = index + 1
    if (nextIndex >= deck.length) {
      finishRun(correctCount)
      return
    }
    if (nextIndex % STAGE_SIZE === 0) {
      setPhase('stageClear')
      return
    }
    setIndex(nextIndex)
    setAnswer('')
    setLastCorrect(null)
    setPhase('playing')
  }

  const continueStage = () => {
    setIndex(index + 1)
    setStage((s) => s + 1)
    setStageCorrect(0)
    setAnswer('')
    setLastCorrect(null)
    setPhase('playing')
  }

  const finishRun = (score: number) => {
    setPhase('done')
    try {
      onQuizFinished(score, deck.length)
    } catch {}
    try {
      if (score > best) {
        localStorage.setItem(BEST_KEY, String(score))
        setBest(score)
      }
    } catch {}
  }

  const progressPct = deck.length ? Math.round((index / deck.length) * 100) : 0

  return (
    <main dir={dir} className="min-h-screen rtl px-4 py-6 sm:py-10" style={{ color: 'var(--text)' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-lg sm:text-xl font-bold">{dict.playTitle}</h1>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] inline-flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            {dict.home}
          </Link>
        </div>

        <GamificationBar compact />

        <div className="card space-y-3">
          <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-[var(--accent)]" />
              {dict.record}: {best}/{BANK.length}
            </span>
            <span>
              {dict.stage} {Math.min(stage, totalStages)} {dict.of} {totalStages}
            </span>
            {phase === 'playing' && (
              <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                <Timer className="w-3.5 h-3.5" />
                {seconds}ث
              </span>
            )}
            {combo > 1 && (
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Zap className="w-3.5 h-3.5" />
                کمبو ×{combo}
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${phase === 'ready' ? 0 : progressPct}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card space-y-4 text-center"
            >
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {dict.playIntro}
              </p>
              <button onClick={startRun} className="btn-primary px-6 py-3">
                {dict.startChallenge}
              </button>
            </motion.div>
          )}

          {phase === 'playing' && current && (
            <motion.div
              key={`q-${current.id}-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="card space-y-4"
            >
              <div className="text-xs text-[var(--accent)]">
                {dict.question} {index + 1} {dict.of} {deck.length}
              </div>
              <h2 className="text-base sm:text-lg font-semibold leading-relaxed">{current.question}</h2>

              {current.type === 'tf' && (
                <div className="grid grid-cols-2 gap-2">
                  {['درست', 'غلط'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(opt)}
                      className={`rounded-xl border px-3 py-3 text-sm ${
                        answer === opt ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {current.type === 'mc' && current.options && (
                <div className="space-y-2">
                  {current.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setAnswer(opt)}
                      className={`w-full text-right rounded-xl border px-3 py-3 text-sm ${
                        answer === opt ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {current.type === 'fill' && (
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                  placeholder="{dict.writeAnswer}"
                  className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
                  style={{ color: 'var(--text)' }}
                />
              )}

              <button
                onClick={() => submitAnswer()}
                disabled={!answer.trim()}
                className="btn-primary w-full py-3 disabled:opacity-40"
              >
                {dict.submitAnswer}
              </button>
            </motion.div>
          )}

          {phase === 'feedback' && current && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card space-y-3"
            >
              <div className="flex items-center gap-2">
                {lastCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <span className="font-semibold">{lastCorrect ? dict.wellDone : dict.notThisTime}</span>
              </div>
              {!lastCorrect && (
                <p className="text-sm text-[var(--muted)]">
                  {dict.correctAnswer}: <span className="text-[var(--accent)]">{current.answer}</span>
                </p>
              )}
              <p className="text-sm text-[var(--muted)] leading-relaxed">{current.explain}</p>
              <button onClick={next} className="btn-primary w-full py-3">
                {dict.continue}
              </button>
            </motion.div>
          )}

          {phase === 'stageClear' && (
            <motion.div
              key="stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card space-y-4 text-center"
            >
              <p className="text-lg font-semibold">{dict.stageDone} ({dict.stage} {stage})</p>
              <p className="text-sm text-[var(--muted)]">
                {dict.stageScore}: {stageCorrect} از {STAGE_SIZE}
              </p>
              <button onClick={continueStage} className="btn-primary px-6 py-3">
                {dict.nextStage}
              </button>
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card space-y-4 text-center"
            >
              <Trophy className="w-8 h-8 mx-auto text-[var(--accent)]" />
              <p className="text-lg font-semibold">{dict.challengeEnd}</p>
              <p className="text-sm text-[var(--muted)]">
                {dict.thisRound}: {correctCount} از {deck.length}
              </p>
              <p className="text-sm text-[var(--muted)]">بهترین {dict.record}: {best}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={startRun} className="btn-primary px-5 py-3">
                  دوباره
                </button>
                <Link href="/start" className="btn-secondary px-5 py-3">
                  گفتگو
                </Link>
                <Link href="/map" className="btn-secondary px-5 py-3">
                  نقشه ذهنی
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
