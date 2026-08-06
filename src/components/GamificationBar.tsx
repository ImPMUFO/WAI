'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Zap, Target, Flame } from 'lucide-react'
import {
  loadGame,
  levelFromXp,
  achievementList,
  MAX_LEVEL,
  type GameState,
} from '@/lib/gamification'

export default function GamificationBar({ compact = false }: { compact?: boolean }) {
  const { dict } = useLocale()
  const [g, setG] = useState<GameState | null>(null)

  const refresh = () => setG(loadGame())

  useEffect(() => {
    refresh()
    const fn = () => refresh()
    window.addEventListener('wai-game-updated', fn)
    return () => window.removeEventListener('wai-game-updated', fn)
  }, [])

  if (!g) return null
  const prog = levelFromXp(g.xp)
  const { level, intoLevel, need } = prog
  const remaining = (prog as { remaining?: number }).remaining ?? Math.max(0, need - intoLevel)
  const atMax = level >= MAX_LEVEL
  const pct = atMax ? 100 : need > 0 ? Math.min(100, Math.round((intoLevel / need) * 100)) : 0
  const achievements = achievementList()

  // رنگ نوار بر اساس درصد
  const barColor =
    pct >= 80 ? 'bg-emerald-400' : pct >= 45 ? 'bg-[var(--accent)]' : 'bg-sky-400'

  if (compact) {
    return (
      <div className="card !py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[var(--muted)]">
          <span className="inline-flex items-center gap-1 text-[var(--accent)] font-semibold">
            <Zap className="w-3.5 h-3.5" />
            {dict.levelWord} {level}
            {atMax ? ' (MAX)' : ''}
          </span>
          <span>
            {g.xp} XP
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" />
            {g.streak} {dict.days}
          </span>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
            <span>
              {atMax
                ? `${dict.levelWord} ${MAX_LEVEL}`
                : `${dict.untilNextLevel} · ${remaining} XP`}
            </span>
            <span>
              {atMax ? '100%' : `${intoLevel}/${need}`}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--border)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Trophy className="w-4 h-4" />
          <span className="font-semibold text-sm">{dict.yourProgress}</span>
        </div>
        <Link href="/play" className="text-xs text-[var(--accent)] hover:opacity-80">
          {dict.missions}
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-[var(--muted)]">
        <span className="inline-flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
          {dict.levelWord} {level}
          {atMax ? ' · MAX' : ''}
        </span>
        <span>
          {g.xp} XP
        </span>
        <span className="inline-flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" />
          {dict.streakDays}: {g.streak}
        </span>
        <span className="inline-flex items-center gap-1">
          <Target className="w-3.5 h-3.5" />
          {g.totalMessages} {dict.messagesCount}
        </span>
      </div>

      <div>
        <div className="flex justify-between text-[10px] sm:text-xs text-[var(--muted)] mb-1.5">
          <span>
            {atMax
              ? `${dict.levelWord} ${MAX_LEVEL}`
              : `${dict.levelWord} ${level} → ${level + 1}`}
          </span>
          <span className="font-medium text-[var(--text)]">
            {atMax ? 'MAX' : `${intoLevel} / ${need} XP`}
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
          <span>{atMax ? '100%' : `${pct}%`}</span>
          {!atMax && (
            <span>
              {remaining} XP
            </span>
          )}
        </div>
        <div className="h-3 rounded-full bg-[var(--border)] overflow-hidden border border-[var(--border)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2 text-xs">
        {Object.entries(g.missions).map(([id, m]) => (
          <div key={id} className="rounded-xl border border-[var(--border)] p-2">
            <div className="text-[var(--muted)] mb-1">
              {id === 'daily_chat' && dict.dailyChatMission}
              {id === 'daily_quiz' && dict.dailyQuizMission}
              {id === 'weekly_domains' && dict.weeklyDomains}
              {id === 'weekly_messages' && dict.weeklyMessages}
            </div>
            <div className="font-medium">
              {m.progress}/{m.target} {m.claimed ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>

      {g.achievements.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {g.achievements.map((id) => (
            <span
              key={id}
              className="px-2 py-1 rounded-full text-[10px] border border-[var(--border)] bg-[var(--accent)]/10 text-[var(--accent)]"
              title={achievements[id]?.desc}
            >
              {achievements[id]?.title || id}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
