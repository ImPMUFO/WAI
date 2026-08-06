'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Sparkles, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react'
import { loadMindMapFromServer, saveMindMapToServer, recoverEverything } from '@/lib/sync'

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
const CANVAS = 900
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
          ? 65
          : status === 'near'
            ? 35
            : 8,
      note: String(n.note || ''),
    })
  }

  if (!seen.has('mind')) {
    out.unshift({
      id: 'mind',
      title: 'ذهن',
      status: 'known',
      mastery: 55,
      note: 'مرکز نقشه ذهنی',
    })
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

function layoutNodes(nodes: KnowledgeNode[]): Laid[] {
  const list = normalizeNodes(nodes)
  const mind = list.find((n) => n.id === 'mind')!
  const rest = list.filter((n) => n.id !== 'mind')

  const rings: { items: KnowledgeNode[]; radius: number }[] = [
    { items: rest.filter((n) => n.status === 'known'), radius: 140 },
    { items: rest.filter((n) => n.status === 'near'), radius: 230 },
    { items: rest.filter((n) => n.status === 'far'), radius: 320 },
  ]

  const pos = new Map<string, { x: number; y: number }>()
  pos.set('mind', { x: CENTER, y: CENTER })

  for (const ring of rings) {
    const n = ring.items.length
    if (!n) continue
    ring.items.forEach((node, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n + (ring.radius % 97) * 0.001
      const r = ring.radius + (i % 2) * 18
      pos.set(node.id, {
        x: CENTER + Math.cos(angle) * r,
        y: CENTER + Math.sin(angle) * r,
      })
    })
  }

  // اگر parent شناخته‌شده است کمی به سمت parent بکش
  for (const node of rest) {
    if (!node.parent || !pos.has(node.parent)) continue
    const p = pos.get(node.parent)!
    const c = pos.get(node.id)
    if (!c) continue
    pos.set(node.id, {
      x: c.x * 0.72 + p.x * 0.28,
      y: c.y * 0.72 + p.y * 0.28,
    })
  }

  // جلوگیری از روی‌هم‌افتادن
  const ids = list.map((n) => n.id)
  for (let iter = 0; iter < 12; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const A = pos.get(ids[i])!
        const B = pos.get(ids[j])!
        const dx = B.x - A.x
        const dy = B.y - A.y
        const dist = Math.hypot(dx, dy) || 0.01
        const min = ids[i] === 'mind' || ids[j] === 'mind' ? 100 : 78
        if (dist >= min) continue
        const push = ((min - dist) / dist) * 0.55
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

  return list.map((n) => ({
    ...n,
    x: pos.get(n.id)?.x ?? CENTER,
    y: pos.get(n.id)?.y ?? CENTER,
  }))
}

function curve(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  return `M ${x1} ${y1} Q ${mx - dy * 0.14} ${my + dx * 0.14} ${x2} ${y2}`
}

export default function KnowledgeMapPage() {
  const { dict, dir } = useLocale()
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<Laid | null>(null)
  const [scale, setScale] = useState(0.85)
  const [busy, setBusy] = useState(false)
  const pinchStart = useRef<number | null>(null)
  const scaleStart = useRef(1)

  const saveLocal = useCallback((data: MapData) => {
    try {
      localStorage.setItem(MAP_KEY, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }, [])

  const load = useCallback(async () => {
    let local: MapData | null = null
    try {
      local = normalizeMap(JSON.parse(localStorage.getItem(MAP_KEY) || 'null'))
    } catch {
      local = null
    }

    let remote: MapData | null = null
    try {
      remote = normalizeMap(await loadMindMapFromServer())
    } catch {
      remote = null
    }

    const merged = mergeMaps(local, remote)
    if (merged) {
      setMap(merged)
      saveLocal(merged)
      // اگر محلی موجود بود، به سرور هم بنویس (ضد پاک‌شدن)
      if (local?.nodes?.length) void saveMindMapToServer(merged)
      return
    }

    // نقشه خالی اولیه تا صفحه سفید نماند
    const seed: MapData = {
      domainTitle: 'نقشه کامل ذهن',
      summary: '',
      updatedAt: new Date().toISOString(),
      nodes: [
        { id: 'mind', title: 'ذهن', status: 'known', mastery: 40, note: 'با گفتگو پر می‌شود' },
        { id: 'hint', title: 'شروع گفتگو', parent: 'mind', status: 'near', mastery: 20, note: '' },
      ],
    }
    setMap(seed)
  }, [saveLocal])

  const recover = async () => {
    setBusy(true)
    try {
      await recoverEverything()
      await load()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void recover()
    const fn = () => void load()
    window.addEventListener('wai-map-updated', fn)
    return () => window.removeEventListener('wai-map-updated', fn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const laid = useMemo(() => (map ? layoutNodes(map.nodes) : []), [map])
  const byId = useMemo(() => new Map(laid.map((n) => [n.id, n])), [laid])
  const edges = useMemo(() => {
    return laid
      .filter((n) => n.id !== 'mind')
      .map((n) => {
        const parent = n.parent && byId.has(n.parent) ? byId.get(n.parent)! : byId.get('mind')!
        return { from: parent, to: n }
      })
  }, [laid, byId])

  const stats = useMemo(
    () => ({
      known: laid.filter((n) => n.status === 'known').length,
      near: laid.filter((n) => n.status === 'near').length,
      far: laid.filter((n) => n.status === 'far').length,
    }),
    [laid]
  )

  const zoomBy = (d: number) => setScale((s) => Math.min(2.2, Math.max(0.45, +(s + d).toFixed(3))))

  return (
    <main dir={dir} className="min-h-screen overflow-hidden" style={{ color: 'var(--text)', background: 'var(--bg0)' }}>
      <header className="relative z-20 border-b border-[var(--border)] backdrop-blur-md bg-[color-mix(in_srgb,var(--bg0)_85%,transparent)]">
        <div className="max-w-6xl mx-auto px-3 py-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-sm sm:text-base font-semibold">{dict.mapTitle}</h1>
            <p className="text-[10px] text-[var(--accent)]">{dict.mapSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void recover()} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]" title="recover">
              <RefreshCw className={`w-4 h-4 text-[var(--accent)] ${busy ? 'animate-spin' : ''}`} />
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
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--card) 92%, var(--accent) 8%) 0%, var(--bg0) 78%)',
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
              const dist = Math.hypot(dx, dy)
              setScale(Math.min(2.2, Math.max(0.45, scaleStart.current * (dist / pinchStart.current))))
            }
          }}
          onTouchEnd={() => {
            pinchStart.current = null
          }}
        >
          {/* کادر با اندازه ثابت — ریشه باگ قبلی همین بود */}
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
              {edges.map((e, i) => (
                <path
                  key={i}
                  d={curve(e.from.x, e.from.y, e.to.x, e.to.y)}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={e.to.status === 'known' ? 2.5 : e.to.status === 'near' ? 1.6 : 1.1}
                  strokeOpacity={e.to.status === 'far' ? 0.22 : 0.5}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {laid.map((n) => {
              const isRoot = n.id === 'mind'
              const cls =
                isRoot
                  ? 'bg-[var(--accent)]/40 border-[var(--accent)] shadow-[0_0_28px_var(--glow)]'
                  : n.status === 'known'
                    ? 'bg-[var(--accent)]/25 border-[var(--accent)]/55 shadow-[0_0_16px_var(--glow)]'
                    : n.status === 'near'
                      ? 'bg-[var(--accent2)]/15 border-[var(--accent)]/35'
                      : 'bg-[var(--card)] border-[var(--border)] opacity-85'

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelected(n)}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: n.x, top: n.y, zIndex: isRoot ? 50 : 10 + (n.status === 'known' ? 3 : n.status === 'near' ? 2 : 1) }}
                >
                  {isRoot && (
                    <span
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl opacity-45 pointer-events-none"
                      style={{ background: 'var(--accent)' }}
                    />
                  )}
                  {n.status === 'far' && (
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full blur-xl bg-[var(--muted)]/20 pointer-events-none" />
                  )}
                  <div className={`relative px-3 py-2 rounded-2xl border backdrop-blur-md ${cls} ${isRoot ? 'scale-110' : ''}`}>
                    <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${n.status === 'far' ? 'text-[var(--muted)]' : 'text-[var(--text)]'}`}>
                      {n.title}
                    </span>
                    {n.status !== 'far' && (
                      <div className="mt-1.5 w-14 h-1 rounded-full bg-[var(--border)] overflow-hidden mx-auto">
                        <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${n.mastery}%` }} />
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
          <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="fixed bottom-0 inset-x-0 z-40 p-4">
            <div className="max-w-md mx-auto rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] p-4 shadow-2xl">
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{selected.title}</h2>
                  <p className="text-[10px] text-[var(--accent)]">
                    {selected.status === 'known' ? dict.mapKnown : selected.status === 'near' ? dict.mapNear : dict.mapFar}
                    {' · '}
                    {Math.round(selected.mastery)}%
                  </p>
                </div>
                <button type="button" className="text-[var(--muted)]" onClick={() => setSelected(null)}>
                  ✕
                </button>
              </div>
              {selected.note ? <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{selected.note}</p> : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
