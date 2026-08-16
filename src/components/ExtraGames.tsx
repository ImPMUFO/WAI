'use client'

import { useEffect, useMemo, useState } from 'react'
import { onQuizQuestionAnswered, questionFingerprint, loadGame, hasAnsweredQuestion } from '@/lib/gamification'
import { useLocale } from '@/lib/i18n/LocaleProvider'

type MatchSide = { id: string; text: string }
type TfItem = { id: string; statement: string; truth: boolean; explain: string }

export default function ExtraGames() {
  const { locale } = useLocale()
  const [tab, setTab] = useState<'match' | 'tf'>('match')
  const [date, setDate] = useState('')
  const [lefts, setLefts] = useState<MatchSide[]>([])
  const [rights, setRights] = useState<MatchSide[]>([])
  const [pickedLeft, setPickedLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<Record<string, boolean>>({})
  const [tf, setTf] = useState<TfItem[]>([])
  const [tfIndex, setTfIndex] = useState(0)
  const [tfDone, setTfDone] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    void load('match')
    void load('truefalse')
  }, [locale])

  const load = async (kind: string) => {
    const date = new Date().toISOString().slice(0, 10)
    const g = loadGame()
    const excluded = (g.answeredQuestions || []).slice(-1500)

    try {
      const res = await fetch('/api/games?_=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, date, locale, excludeIds: excluded }),
      })
      const data = await res.json()
      setDate(data.date || '')
      setSource(data.source || '')

      if (kind === 'match') {
        setLefts(data.lefts || [])
        setRights(data.rights || [])
        setMatched({})
        setPickedLeft(null)
      } else {
        setTf(data.items || [])
        setTfIndex(0)
        setTfDone({})
      }
    } catch {
      if (kind === 'match') {
        setLefts([])
        setRights([])
      } else {
        setTf([])
      }
    }
  }

  const onPickRight = (rightId: string) => {
    if (!pickedLeft) return
    const ok = pickedLeft === rightId
    const key = `match-${pickedLeft}`
    if (matched[key]) return

    // سؤال/جفت بعد از اولین تلاش برای همیشه قفل می‌شود؛ حتی اگر اشتباه باشد.
    const pair = lefts.find((x) => x.id === pickedLeft)
    const fingerprint = questionFingerprint(`${pair?.text || pickedLeft}::${rightId}`)
    const res = onQuizQuestionAnswered(fingerprint, ok, {
      xpCorrect: 5,
      xpWrong: 1,
      domain: 'general',
    })

    setMatched((m) => ({ ...m, [key]: true }))
    setFeedback(ok ? `درست! +${res.gainedXp} XP` : 'نادرست؛ این جفت بسته شد و تکرار نمی‌شود.')
    setPickedLeft(null)
  }

  const currentTf = tf[tfIndex]

  const answerTf = (val: boolean) => {
    if (!currentTf || tfDone[currentTf.id]) return
    const ok = currentTf.truth === val
    const id = currentTf.id || questionFingerprint(currentTf.statement)
    const res = onQuizQuestionAnswered(id, ok, { xpCorrect: 5, xpWrong: 1, domain: 'general' })
    setTfDone((d) => ({ ...d, [currentTf.id]: true }))
    setFeedback(ok ? `درست! +${res.gainedXp} XP — ${currentTf.explain}` : `نادرست — ${currentTf.explain}`)
  }

  const matchProgress = useMemo(() => Object.keys(matched).length, [matched])

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="text-xs text-[var(--accent)]"
        onClick={() => {
          void load('match')
          void load('truefalse')
        }}
      >
        مجموعه جدید بازی‌ها
      </button>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab('match')} className={`flex-1 py-2 rounded-xl border text-sm ${tab === 'match' ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'}`}>
          ارتباط مفاهیم
        </button>
        <button type="button" onClick={() => setTab('tf')} className={`flex-1 py-2 rounded-xl border text-sm ${tab === 'tf' ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'}`}>
          درست / نادرست
        </button>
      </div>

      <p className="text-[11px] text-[var(--muted)]">روزانه · {date}{source ? ` · ${source}` : ''}</p>
      {feedback && <p className="text-xs text-[var(--accent)]">{feedback}</p>}

      {tab === 'match' && (
        <div className="card space-y-3">
          <p className="text-sm font-medium">هر مفهوم را به تعریف درست وصل کن ({matchProgress}/{lefts.length})</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {lefts.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  disabled={!!matched[`match-${l.id}`]}
                  onClick={() => setPickedLeft(l.id)}
                  className={`w-full text-right text-sm px-3 py-2 rounded-xl border ${
                    pickedLeft === l.id ? 'border-[var(--accent)] bg-[var(--accent)]/20' : 'border-[var(--border)]'
                  } ${matched[`match-${l.id}`] ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {l.text}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {rights.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={Object.keys(matched).some((k) => k.endsWith(r.id))}
                  onClick={() => onPickRight(r.id)}
                  className={`w-full text-right text-sm px-3 py-2 rounded-xl border border-[var(--border)] ${
                    Object.keys(matched).some((k) => k.endsWith(r.id)) ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  {r.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'tf' && currentTf && (
        <div className="card space-y-4">
          <p className="text-xs text-[var(--muted)]">سؤال {tfIndex + 1} از {tf.length}</p>
          <p className="text-sm leading-relaxed">{currentTf.statement}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-primary py-3" onClick={() => answerTf(true)} disabled={!!tfDone[currentTf.id]}>درست</button>
            <button type="button" className="btn-secondary py-3" onClick={() => answerTf(false)} disabled={!!tfDone[currentTf.id]}>نادرست</button>
          </div>
          {tfDone[currentTf.id] && (
            <button type="button" className="btn-secondary w-full py-2 text-sm" onClick={() => setTfIndex((i) => Math.min(tf.length - 1, i + 1))}>
              بعدی
            </button>
          )}
        </div>
      )}
    </div>
  )
}
