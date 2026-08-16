'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Compass, Map, Sparkles, Trophy, Brain, ArrowLeft } from 'lucide-react'
import SiteMenu from '@/components/SiteMenu'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { loadJourney, type JourneyEvent } from '@/lib/knowledge-graph'
import { loadMindMap } from '@/lib/mindmap'
import { loadGame, levelTitle } from '@/lib/gamification'

export default function JourneyPage() {
  const { dict, dir, locale } = useLocale()
  const [events, setEvents] = useState<JourneyEvent[]>([])
  const [stats, setStats] = useState({ nodes: 0, known: 0, xp: 0, level: 1 })

  useEffect(() => {
    setEvents(loadJourney())
    try {
      const map = loadMindMap()
      const g = loadGame()
      const nodes = map?.nodes?.filter((n) => n.id !== 'mind') || []
      setStats({
        nodes: nodes.length,
        known: nodes.filter((n) => n.status === 'known').length,
        xp: g.xp || 0,
        level: g.level || 1,
      })
    } catch {}
  }, [])

  const progress = stats.nodes ? Math.round((stats.known / stats.nodes) * 100) : 0

  return (
    <main className="min-h-screen" dir={dir} style={{ color: 'var(--text)' }}>
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg0)_78%,transparent)] backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg,var(--accent-dim),color-mix(in srgb,var(--accent2) 12%,transparent))',
                border: '1px solid color-mix(in srgb,var(--accent) 35%,var(--border))',
              }}
            >
              <Compass className="h-6 w-6" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-base sm:text-lg truncate">
                {locale === 'en' ? 'My knowledge journey' : 'سفر دانش من'}
              </h1>
              <p className="text-[11px] text-[var(--muted)] truncate">
                {locale === 'en' ? 'Your path from curiosity to understanding' : 'مسیر زنده‌ای که از کنجکاوی تا فهم طی می‌کنی'}
              </p>
            </div>
          </div>
          <SiteMenu />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-5">
        <section
          className="relative overflow-hidden rounded-[2rem] border p-5 sm:p-7"
          style={{
            background:
              'radial-gradient(circle at 85% 20%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 35%),linear-gradient(135deg,color-mix(in srgb,var(--card-solid) 94%,var(--accent)),var(--card-solid))',
            borderColor: 'color-mix(in srgb,var(--accent) 28%,var(--border))',
          }}
        >
          <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full blur-3xl opacity-20" style={{ background: 'var(--accent2)' }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold mb-3" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
                <Sparkles className="h-3.5 w-3.5" />
                {locale === 'en' ? 'YOUR JOURNEY' : 'سفر تو'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                {locale === 'en' ? 'Every conversation leaves a trace.' : 'هر گفتگو یک ردّ در ذهنت به جا می‌گذارد.'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {locale === 'en'
                  ? 'See what you have explored, what is becoming clearer, and where your next step can be.'
                  : 'ببین کجاها را کشف کرده‌ای، چه چیزهایی روشن‌تر شده‌اند و قدم بعدی‌ات کجاست.'}
              </p>
            </div>
            <div className="shrink-0 text-center rounded-3xl px-6 py-5" style={{ background: 'color-mix(in srgb,var(--bg0) 65%,transparent)', border: '1px solid var(--border)' }}>
              <div className="text-4xl font-black" style={{ color: 'var(--accent)' }}>{progress}%</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
                {locale === 'en' ? 'areas known' : 'از نواحی روشن'}
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            [Brain, locale === 'en' ? 'Areas' : 'نواحی', stats.nodes],
            [Sparkles, locale === 'en' ? 'Known' : 'روشن', stats.known],
            [Trophy, 'XP', stats.xp],
            [Compass, locale === 'en' ? 'Level' : 'سطح', levelTitle(stats.level)],
          ].map(([Icon, key, value]) => {
            const C = Icon as any
            return (
              <div key={String(key)} className="card !p-4 text-center">
                <C className="mx-auto h-5 w-5 mb-2" style={{ color: 'var(--accent)' }} />
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{key}</p>
                <p className="text-sm font-black mt-1 truncate">{value}</p>
              </div>
            )
          })}
        </div>

        <section className="card !p-0 overflow-hidden">
          <div className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 className="font-black text-base">{locale === 'en' ? 'Your timeline' : 'ردپای سفر تو'}</h2>
              <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
                {locale === 'en' ? 'Conversations, discoveries and progress' : 'گفتگوها، کشف‌ها و پیشرفت‌ها'}
              </p>
            </div>
            <div className="text-2xl">🧭</div>
          </div>

          {events.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-5xl mb-3">🌌</div>
              <p className="font-bold">{locale === 'en' ? 'Your journey is just beginning.' : 'سفر دانش تو تازه شروع شده.'}</p>
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                {locale === 'en' ? 'Chat, play, or explore the map and your first traces will appear here.' : 'گفتگو کن، بازی کن یا نقشه را کشف کن؛ اولین ردپاها اینجا ظاهر می‌شوند.'}
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="relative">
                <div className="absolute top-2 bottom-2 right-[11px] w-px" style={{ background: 'var(--border)' }} />
                <ul className="space-y-4">
                  {events.slice(0, 40).map((e, i) => (
                    <li key={i} className="relative flex gap-3">
                      <div className="relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-dim)', border: '1px solid color-mix(in srgb,var(--accent) 40%,var(--border))' }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0 rounded-2xl p-3" style={{ background: 'color-mix(in srgb,var(--card-solid) 72%,transparent)', border: '1px solid var(--border)' }}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold text-sm">{e.label}</p>
                          <span className="text-[10px] shrink-0" style={{ color: 'var(--muted)' }}>
                            {new Date(e.ts).toLocaleDateString(locale === 'en' ? 'en' : 'fa-IR')}
                          </span>
                        </div>
                        {typeof e.delta === 'number' && (
                          <p className="text-[11px] mt-1 font-bold" style={{ color: e.delta > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                            {e.delta > 0 ? '+' : ''}{e.delta}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-wrap gap-2">
          <Link href="/map" className="btn-primary text-sm px-4 py-2.5 inline-flex items-center gap-2">
            <Map className="h-4 w-4" /> {dict.mindMap}
          </Link>
          <Link href="/start" className="btn-secondary text-sm px-4 py-2.5 inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> {dict.chat}
          </Link>
        </div>
      </div>
    </main>
  )
}
