'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Gamepad2, CheckCircle2, XCircle, Trophy, Lock } from 'lucide-react'
import GamificationBar from '@/components/GamificationBar'
import {
  getActiveDomains,
  loadGame,
  onQuizQuestionAnswered,
  hasAnsweredQuestion,
} from '@/lib/gamification'
import { useLocale } from '@/lib/i18n/LocaleProvider'

type QuizItem = {
  id: string
  domain: string
  question: string
  options: string[]
  answer: string
  explain: string
}

const CACHE_KEY = 'waima_daily_quiz_v1'

type Phase = 'loading' | 'list' | 'feedback' | 'empty'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function PlayPage() {
  const { dict, dir, locale } = useLocale()
  const [items, setItems] = useState<QuizItem[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [current, setCurrent] = useState<QuizItem | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [already, setAlready] = useState(false)
  const [gained, setGained] = useState(0)
  const [answeredSet, setAnsweredSet] = useState<Set<string>>(new Set())
  const [source, setSource] = useState('')

  const remaining = useMemo(
    () => items.filter((q) => !answeredSet.has(q.id)),
    [items, answeredSet]
  )

  useEffect(() => {
    const g = loadGame()
    setAnsweredSet(new Set(g.answeredQuestions || []))
    void loadDaily()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  const loadDaily = async () => {
    setPhase('loading')
    const date = today()
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.date === date && Array.isArray(parsed.items) && parsed.items.length) {
          setItems(parsed.items)
          setSource(parsed.source || 'cache')
          setPhase(parsed.items.some((q: QuizItem) => !hasAnsweredQuestion(loadGame(), q.id)) ? 'list' : 'empty')
          return
        }
      }
    } catch {
      /* ignore */
    }

    try {
      const g = loadGame()
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          level: g.level || 1,
          domains: getActiveDomains(),
          date,
        }),
      })
      const data = await res.json()
      const list = (data?.items || []) as QuizItem[]
      setItems(list)
      setSource(data?.source || 'api')
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ date, items: list, source: data?.source }))
      } catch {
        /* ignore */
      }
      const ans = new Set(loadGame().answeredQuestions || [])
      setAnsweredSet(ans)
      setPhase(list.some((q) => !ans.has(q.id)) ? 'list' : 'empty')
    } catch {
      setItems([])
      setPhase('empty')
    }
  }

  const openQuestion = (q: QuizItem) => {
    if (answeredSet.has(q.id)) return
    setCurrent(q)
    setPicked(null)
    setLocked(false)
    setLastCorrect(null)
    setAlready(false)
    setGained(0)
    setPhase('feedback')
  }

  const submit = (opt: string) => {
    if (!current || locked) return
    setPicked(opt)
    setLocked(true)
    const correct = opt === current.answer
    setLastCorrect(correct)
    const res = onQuizQuestionAnswered(current.id, correct)
    setAlready(res.alreadyAnswered)
    setGained(res.gainedXp)
    const nextSet = new Set(answeredSet)
    nextSet.add(current.id)
    setAnsweredSet(nextSet)
    window.dispatchEvent(new Event('wai-game-updated'))
  }

  const backToList = () => {
    setCurrent(null)
    setPicked(null)
    setLocked(false)
    const left = items.some((q) => !answeredSet.has(q.id) && q.id !== current?.id)
    // recompute with updated set
    const ans = new Set(loadGame().answeredQuestions || [])
    setAnsweredSet(ans)
    setPhase(items.some((q) => !ans.has(q.id)) ? 'list' : 'empty')
  }

  return (
    <main dir={dir} className="min-h-screen px-4 py-6 sm:py-10" style={{ color: 'var(--text)' }}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-[var(--accent)]" />
            <h1 className="text-lg sm:text-xl font-bold">{dict.playTitle}</h1>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] inline-flex items-center gap-1">
            <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            {dict.home}
          </Link>
        </div>

        <GamificationBar compact />

        <div className="card text-sm text-[var(--muted)] leading-relaxed">
          {dict.playIntro}
          <div className="mt-2 text-xs opacity-80">
            {today()} · {remaining.length} {dict.of} {items.length}
            {source === 'ai' ? ' · AI' : source ? ` · ${source}` : ''}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {phase === 'loading' && (
            <motion.div key="loading" className="card text-center text-[var(--muted)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {dict.thinking}
            </motion.div>
          )}

          {phase === 'list' && (
            <motion.div key="list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              {items.map((q, i) => {
                const done = answeredSet.has(q.id)
                return (
                  <button
                    key={q.id}
                    disabled={done}
                    onClick={() => openQuestion(q)}
                    className={`w-full text-right card !py-3 flex items-center gap-3 ${
                      done ? 'opacity-55 cursor-not-allowed' : 'hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <span className="text-xs text-[var(--accent)] w-6">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium line-clamp-2">{q.question}</span>
                    {done ? (
                      <Lock className="w-4 h-4 text-[var(--muted)] shrink-0" />
                    ) : (
                      <span className="text-xs text-[var(--accent)] shrink-0">MCQ</span>
                    )}
                  </button>
                )
              })}
            </motion.div>
          )}

          {phase === 'feedback' && current && (
            <motion.div key="q" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
              <h2 className="text-base sm:text-lg font-semibold leading-relaxed">{current.question}</h2>
              <div className="space-y-2">
                {current.options.map((opt) => {
                  const show = locked
                  const isAns = opt === current.answer
                  const isPick = opt === picked
                  let cls = 'border-[var(--border)]'
                  if (show && isAns) cls = 'border-emerald-400 bg-emerald-500/15'
                  else if (show && isPick && !isAns) cls = 'border-rose-400 bg-rose-500/15'
                  else if (!show && isPick) cls = 'border-[var(--accent)] bg-[var(--accent)]/15'
                  return (
                    <button
                      key={opt}
                      disabled={locked}
                      onClick={() => submit(opt)}
                      className={`w-full text-right rounded-xl border px-3 py-3 text-sm transition-colors ${cls} disabled:cursor-default`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>

              {locked && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {lastCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                    <span className="font-semibold">
                      {already
                        ? dir === 'ltr'
                          ? 'Already answered'
                          : 'قبلاً پاسخ داده شده'
                        : lastCorrect
                          ? dict.wellDone
                          : dict.notThisTime}
                    </span>
                  </div>
                  {!lastCorrect && (
                    <p className="text-sm text-[var(--muted)]">
                      {dict.correctAnswer}: <span className="text-[var(--accent)]">{current.answer}</span>
                    </p>
                  )}
                  <p className="text-sm text-[var(--muted)] leading-relaxed">{current.explain}</p>
                  {!already && gained > 0 && (
                    <p className="text-xs text-[var(--accent)]">+{gained} XP</p>
                  )}
                  <button onClick={backToList} className="btn-primary w-full py-3">
                    {dict.continue}
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {phase === 'empty' && (
            <motion.div key="empty" className="card text-center space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Trophy className="w-8 h-8 mx-auto text-[var(--accent)]" />
              <p className="font-semibold">
                {dir === 'ltr' ? "Today's quiz is done" : 'سؤالات امروز تمام شد'}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {dir === 'ltr' ? 'Come back tomorrow for a new set.' : 'فردا مجموعهٔ جدیدی می‌آید.'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/start" className="btn-primary px-5 py-3">
                  {dict.chat}
                </Link>
                <Link href="/map" className="btn-secondary px-5 py-3">
                  {dict.mindMap}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
