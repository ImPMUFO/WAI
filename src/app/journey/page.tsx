
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
    } catch {
      /* */
    }
  }, [])

  return (
    <main className="min-h-screen" dir={dir} style={{ color: 'var(--text)' }}>
      <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg0)_80%,transparent)] backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base">
              {locale === 'en' ? 'My knowledge journey' : 'سفر دانش من'}
            </h1>
            <p className="text-[11px] text-[var(--muted)]">
              {locale === 'en' ? 'Growth over time' : 'پیشرفت در طول زمان'}
            </p>
          </div>
          <SiteMenu />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            [locale === 'en' ? 'Areas' : 'نواحی', stats.nodes],
            [locale === 'en' ? 'Known' : 'معلوم', stats.known],
            ['XP', stats.xp],
            [locale === 'en' ? 'Level' : 'سطح', levelTitle(stats.level)],
          ].map(([k, v]) => (
            <div key={String(k)} className="card !p-3 text-center">
              <p className="text-[10px] text-[var(--muted)]">{k}</p>
              <p className="text-sm font-semibold mt-1 truncate">{v}</p>
            </div>
          ))}
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-sm">
            {locale === 'en' ? 'Timeline' : 'جدول زمانی'}
          </h2>
          {events.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              {locale === 'en'
                ? 'No events yet. Chat, play, or update your map — they show up here.'
                : 'هنوز رویدادی نیست. گفتگو، بازی یا به‌روزرسانی نقشه اینجا ثبت می‌شود.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 40).map((e, i) => (
                <li key={i} className="flex gap-3 text-sm border-b border-[var(--border)] last:border-0 pb-2">
                  <span className="text-[10px] text-[var(--muted)] shrink-0 w-16">
                    {new Date(e.ts).toLocaleDateString(locale === 'en' ? 'en' : 'fa-IR')}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{e.label}</p>
                    {typeof e.delta === 'number' ? (
                      <p className="text-[11px] text-[var(--accent)]">
                        {e.delta > 0 ? '+' : ''}
                        {e.delta}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/map" className="btn-primary text-sm px-4 py-2">
            {dict.mindMap}
          </Link>
          <Link href="/start" className="rounded-xl border border-[var(--border)] text-sm px-4 py-2">
            {dict.chat}
          </Link>
        </div>
      </div>
    </main>
  )
}
