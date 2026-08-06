'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Sparkles, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'
import { loadMindMapFromServer, saveMindMapToServer } from '@/lib/sync'

type NodeStatus = 'known' | 'near' | 'far'
type KnowledgeNode = {
  id: string
  title: string
  parent?: string
  status: NodeStatus
  mastery: number
  note: string
}
type MapData = {
  domainTitle?: string
  summary?: string
  updatedAt?: string
  nodes: KnowledgeNode[]
}

const MAP_KEY = 'wai_map_unified'
const CANVAS = 920
const CENTER = CANVAS / 2

function asStatus(v: unknown): NodeStatus {
  if (v === 'known' || v === 'near' || v === 'far') return v
  return 'far'
}

function normalizeNodes(raw: unknown): KnowledgeNode[] {
  const arr = Array.isArray(raw) ? raw : []
  const out: KnowledgeNode[] = []
  const seen = new Set<string>()
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue
    const n = item as Record<string, unknown>
    const id = String(n.id || '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const status = asStatus(n.status)
    const masteryNum = Number(n.mastery)
    out.push({
      id,
      title: String(n.title || id),
      parent: n.parent ? String(n.parent) : undefined,
      status,
      mastery: Number.isFinite(masteryNum)
        ? Math.max(0, Math.min(100, masteryNum))
        : status === 'known'
          ? 60
          : status === 'near'
            ? 30
            : 6,
      note: String(n.note || ''),
    })
  }
  if (!seen.has('mind')) {
    out.unshift({ id: 'mind', title: 'ذهن', status: 'known', mastery: 40, note: 'مرکز آگاهی' })
  }
  return out
}

function normalizeMap(data: unknown): MapData | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const nodes = normalizeNodes(d.nodes)
  if (!nodes.length) return null
  return {
    domainTitle: String(d.domainTitle || 'نقشه کامل ذهن'),
    summary: String(d.summary || ''),
    updatedAt: String(d.updatedAt || new Date().toISOString()),
    nodes,
  }
}

function mergeMaps(a: MapData | null, b: MapData | null): MapData | null {
  if (!a && !b) return null
  if (!a) return b
  if (!b) return a
  const map = new Map<string, KnowledgeNode>()
  for (const n of a.nodes) map.set(n.id, n)
  for (const n of b.nodes) {
    const prev = map.get(n.id)
    if (!prev) {
      map.set(n.id, n)
      continue
    }
    const rank = (s: NodeStatus) => (s === 'known' ? 2 : s === 'near' ? 1 : 0)
    map.set(n.id, {
      ...prev,
      ...n,
      title: n.title || prev.title,
      mastery: Math.max(prev.mastery, n.mastery),
      status: rank(n.status) >= rank(prev.status) ? n.status : prev.status,
      note: (n.note?.length || 0) >= (prev.note?.length || 0) ? n.note : prev.note,
      parent: n.parent || prev.parent,
    })
  }
  return {
    domainTitle: b.domainTitle || a.domainTitle,
    summary: b.summary || a.summary,
    updatedAt: new Date().toISOString(),
    nodes: normalizeNodes(Array.from(map.values())),
  }
}

type Laid = KnowledgeNode & { x: number; y: number }

/** چیدمان شبیه نیمکره‌های مغز */
function layoutBrain(nodes: KnowledgeNode[]): Laid[] {
  const list = normalizeNodes(nodes)
  const mind = list.find((n) => n.id === 'mind')!
  const rest = list.filter((n) => n.id !== 'mind')
  const pos = new Map<string, { x: number; y: number }>()
  pos.set('mind', { x: CENTER, y: CENTER })

  // دو نیمکره + ساقه
  const left = rest.filter((_, i) => i % 2 === 0)
  const right = rest.filter((_, i) => i % 2 === 1)

  const placeLobe = (arr: KnowledgeNode[], side: -1 | 1) => {
    arr.forEach((node, i) => {
      const ring =
        node.status === 'known' ? 0 : node.status === 'near' ? 1 : 2
      const baseR = 120 + ring * 85 + (i % 3) * 14
      const t = arr.length <= 1 ? 0.5 : i / (arr.length - 1)
      // قوس نیمکره
      const angle = side === -1
        ? Math.PI * (0.55 + t * 0.9)
        : -Math.PI * (0.55 + t * 0.9)
      const bulge = 1 + ring * 0.08
      pos.set(node.id, {
        x: CENTER + Math.cos(angle) * baseR * bulge * (side === -1 ? 1.05 : 1.05),
        y: CENTER + Math.sin(angle) * baseR * 0.9 - 20,
      })
    })
  }
  placeLobe(left, -1)
  placeLobe(right, 1)

  // نزدیک کردن به parent
  for (const n of rest) {
    if (n.parent && pos.has(n.parent)) {
      const p = pos.get(n.parent)!
      const c = pos.get(n.id)!
      pos.set(n.id, { x: c.x * 0.78 + p.x * 0.22, y: c.y * 0.78 + p.y * 0.22 })
    }
  }

  // جداسازی
  const ids = list.map((n) => n.id)
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const A = pos.get(ids[i])!
        const B = pos.get(ids[j])!
        const dx = B.x - A.x
        const dy = B.y - A.y
        const dist = Math.hypot(dx, dy) || 0.01
        const min = ids[i] === 'mind' || ids[j] === 'mind' ? 95 : 72
        if (dist >= min) continue
        const push = ((min - dist) / dist) * 0.5
        if (ids[i] !== 'mind') {
          A.x -= dx * push
          A.y -= dy * push
        }
        if (ids[j] !== 'mind') {
          B.x += dx * push
          B.y += dy * push
        }
      }
    }
  }

  return list.map((n) => ({ ...n, x: pos.get(n.id)?.x ?? CENTER, y: pos.get(n.id)?.y ?? CENTER }))
}

function vesselPath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  // منحنی مویرگی
  return `M ${x1} ${y1} Q ${mx - dy * 0.2} ${my + dx * 0.2} ${x2} ${y2}`
}

export default function KnowledgeMapPage() {
  const { dict, dir } = useLocale()
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<Laid | null>(null)
  const [scale, setScale] = useState(0.88)
  const [syncing, setSyncing] = useState(false)
  const pinchStart = useRef<number | null>(null)
  const scaleStart = useRef(1)

  // فوری از local — بدون منتظر سرور
  useEffect(() => {
    try {
      const local = normalizeMap(JSON.parse(localStorage.getItem(MAP_KEY) || 'null'))
      if (local) setMap(local)
      else {
        setMap({
          domainTitle: 'نقشه کامل ذهن',
          nodes: [
            { id: 'mind', title: 'ذهن', status: 'known', mastery: 35, note: 'مرکز' },
            { id: 'philosophy', title: 'فلسفه', parent: 'mind', status: 'far', mastery: 5, note: '' },
            { id: 'science', title: 'علوم', parent: 'mind', status: 'far', mastery: 5, note: '' },
            { id: 'history', title: 'تاریخ', parent: 'mind', status: 'far', mastery: 5, note: '' },
            { id: 'math', title: 'ریاضی', parent: 'mind', status: 'far', mastery: 5, note: '' },
          ],
        })
      }
    } catch {
      /* ignore */
    }

    // سرور در پس‌زمینه
    let cancelled = false
    ;(async () => {
      setSyncing(true)
      try {
        const remote = normalizeMap(await loadMindMapFromServer())
        if (cancelled) return
        setMap((prev) => {
          const merged = mergeMaps(prev, remote)
          if (merged) {
            try {
              localStorage.setItem(MAP_KEY, JSON.stringify(merged))
            } catch {}
            if (prev?.nodes?.length) void saveMindMapToServer(merged)
            return merged
          }
          return prev
        })
      } finally {
        if (!cancelled) setSyncing(false)
      }
    })()

    const onUpd = () => {
      try {
        const local = normalizeMap(JSON.parse(localStorage.getItem(MAP_KEY) || 'null'))
        if (local) setMap(local)
      } catch {}
    }
    window.addEventListener('wai-map-updated', onUpd)
    return () => {
      cancelled = true
      window.removeEventListener('wai-map-updated', onUpd)
    }
  }, [])

  const laid = useMemo(() => (map ? layoutBrain(map.nodes) : []), [map])
  const byId = useMemo(() => new Map(laid.map((n) => [n.id, n])), [laid])
  const edges = useMemo(
    () =>
      laid
        .filter((n) => n.id !== 'mind')
        .map((n) => ({
          from: (n.parent && byId.get(n.parent)) || byId.get('mind')!,
          to: n,
        })),
    [laid, byId]
  )

  const stats = useMemo(
    () => ({
      known: laid.filter((n) => n.status === 'known').length,
      near: laid.filter((n) => n.status === 'near').length,
      far: laid.filter((n) => n.status === 'far').length,
    }),
    [laid]
  )

  const zoomBy = (d: number) => setScale((s) => Math.min(2.2, Math.max(0.45, +(s + d).toFixed(3))))

  const refresh = useCallback(async () => {
    setSyncing(true)
    try {
      const remote = normalizeMap(await loadMindMapFromServer())
      setMap((prev) => {
        const merged = mergeMaps(prev, remote)
        if (merged) {
          try {
            localStorage.setItem(MAP_KEY, JSON.stringify(merged))
          } catch {}
          void saveMindMapToServer(merged)
          return merged
        }
        return prev
      })
    } finally {
      setSyncing(false)
    }
  }, [])

  return (
    <main dir={dir} className="min-h-screen overflow-hidden" style={{ color: 'var(--text)', background: 'var(--bg0)' }}>
      <header className="relative z-20 border-b border-[var(--border)] backdrop-blur-md bg-[color-mix(in_srgb,var(--bg0)_85%,transparent)]">
        <div className="max-w-6xl mx-auto px-3 py-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-sm sm:text-base font-semibold">{dict.mapTitle}</h1>
            <p className="text-[10px] text-[var(--accent)]">
              {dict.mapSubtitle}
              {syncing ? ' · …' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void refresh()} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <RefreshCw className={`w-4 h-4 text-[var(--accent)] ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => zoomBy(0.1)} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <ZoomIn className="w-4 h-4 text-[var(--accent)]" />
            </button>
            <button type="button" onClick={() => zoomBy(-0.1)} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <ZoomOut className="w-4 h-4 text-[var(--accent)]" />
            </button>
            <Link href="/" className="text-sm text-[var(--muted)] inline-flex items-center gap-1">
              <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              {dict.home}
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 pt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--accent)]/15 text-[var(--accent)]">
          <Eye className="w-3 h-3 inline ml-1" /> {dict.mapKnown} ({stats.known})
        </span>
        <span className="px-2 py-1 rounded-full border border-[var(--border)]">
          <Sparkles className="w-3 h-3 inline ml-1" /> {dict.mapNear} ({stats.near})
        </span>
        <span className="px-2 py-1 rounded-full border border-[var(--border)] text-[var(--muted)]">
          <EyeOff className="w-3 h-3 inline ml-1" /> {dict.mapFar} ({stats.far})
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-2 py-3">
        <div
          className="relative w-full h-[74vh] min-h-[460px] rounded-3xl border border-[var(--border)] overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at 50% 45%, color-mix(in srgb, var(--accent) 18%, var(--bg1)) 0%, var(--bg0) 70%)',
          }}
          onWheel={(e) => {
            e.preventDefault()
            zoomBy(e.deltaY > 0 ? -0.05 : 0.05)
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX
              const dy = e.touches[0].clientY - e.touches[1].clientY
              pinchStart.current = Math.hypot(dx, dy)
              scaleStart.current = scale
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinchStart.current) {
              const dx = e.touches[0].clientX - e.touches[1].clientX
              const dy = e.touches[0].clientY - e.touches[1].clientY
              setScale(Math.min(2.2, Math.max(0.45, scaleStart.current * (Math.hypot(dx, dy) / pinchStart.current))))
            }
          }}
          onTouchEnd={() => {
            pinchStart.current = null
          }}
        >
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: CANVAS,
              height: CANVAS,
              marginLeft: -CANVAS / 2,
              marginTop: -CANVAS / 2,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            <svg width={CANVAS} height={CANVAS} className="absolute inset-0 pointer-events-none overflow-visible">
              <defs>
                <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </radialGradient>
                <filter id="soft">
                  <feGaussianBlur stdDeviation="2.5" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* بافت نیمکره‌ها */}
              <ellipse cx={CENTER - 70} cy={CENTER - 10} rx="210" ry="250" fill="url(#brainGlow)" opacity="0.55" />
              <ellipse cx={CENTER + 70} cy={CENTER - 10} rx="210" ry="250" fill="url(#brainGlow)" opacity="0.55" />
              {/* چین‌های ظریف */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path
                  key={i}
                  d={`M ${CENTER - 160 + i * 8} ${CENTER - 160 + i * 12}
                      Q ${CENTER - 40} ${CENTER - 40 + i * 18}
                        ${CENTER + 20 - i * 6} ${CENTER + 140 - i * 10}`}
                  fill="none"
                  stroke="var(--accent)"
                  strokeOpacity={0.08 + i * 0.02}
                  strokeWidth="1.2"
                />
              ))}

              {/* مویرگ‌ها */}
              {edges.map((e, i) => (
                <path
                  key={i}
                  d={vesselPath(e.from.x, e.from.y, e.to.x, e.to.y)}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={e.to.status === 'known' ? 2.6 : e.to.status === 'near' ? 1.7 : 1.1}
                  strokeOpacity={e.to.status === 'far' ? 0.18 : 0.48}
                  strokeLinecap="round"
                  filter={e.to.status === 'known' ? 'url(#soft)' : undefined}
                />
              ))}

              {/* سلول‌های پراکنده */}
              {laid.map((n, i) =>
                n.status !== 'far' ? (
                  <circle
                    key={`c-${n.id}`}
                    cx={n.x + ((i * 17) % 9) - 4}
                    cy={n.y + ((i * 13) % 9) - 4}
                    r={1.6 + (n.mastery / 100) * 2}
                    fill="var(--accent2)"
                    opacity={0.35}
                  />
                ) : null
              )}
            </svg>

            {laid.map((n) => {
              const isRoot = n.id === 'mind'
              const cls = isRoot
                ? 'bg-[var(--accent)]/45 border-[var(--accent)] shadow-[0_0_32px_var(--glow)]'
                : n.status === 'known'
                  ? 'bg-[var(--accent)]/28 border-[var(--accent)]/60 shadow-[0_0_16px_var(--glow)]'
                  : n.status === 'near'
                    ? 'bg-[var(--accent2)]/14 border-[var(--accent)]/35'
                    : 'bg-[var(--card)]/90 border-[var(--border)] opacity-80'

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelected(n)}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: n.x,
                    top: n.y,
                    zIndex: isRoot ? 50 : 10 + (n.status === 'known' ? 3 : n.status === 'near' ? 2 : 1),
                  }}
                >
                  {isRoot && (
                    <span
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full blur-2xl opacity-50 pointer-events-none"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  {n.status === 'far' && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-xl bg-[var(--muted)]/25 pointer-events-none" />
                  )}
                  <div className={`relative px-3 py-2 rounded-full border backdrop-blur-md ${cls} ${isRoot ? 'scale-110' : ''}`}>
                    <span
                      className={`text-[11px] sm:text-sm font-medium whitespace-nowrap ${
                        n.status === 'far' ? 'text-[var(--muted)]' : 'text-[var(--text)]'
                      }`}
                    >
                      {n.title}
                    </span>
                    {n.status !== 'far' && (
                      <div className="mt-1.5 w-12 h-1 rounded-full bg-[var(--border)] overflow-hidden mx-auto">
                        <div
                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-700"
                          style={{ width: `${n.mastery}%` }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-[var(--muted)] pointer-events-none">
            {dict.mapHint} · {dir === 'ltr' ? 'Zoom only' : 'فقط زوم'}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-40 p-4"
          >
            <div className="max-w-md mx-auto rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] p-4 shadow-2xl">
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{selected.title}</h2>
                  <p className="text-[10px] text-[var(--accent)]">
                    {selected.status === 'known'
                      ? dict.mapKnown
                      : selected.status === 'near'
                        ? dict.mapNear
                        : dict.mapFar}{' '}
                    · {Math.round(selected.mastery)}%
                  </p>
                </div>
                <button type="button" className="text-[var(--muted)]" onClick={() => setSelected(null)}>
                  ✕
                </button>
              </div>
              {selected.note ? (
                <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{selected.note}</p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
