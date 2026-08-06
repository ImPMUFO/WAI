'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, Lock, Sparkles, ZoomIn, ZoomOut } from 'lucide-react'
import { loadMindMapFromServer, saveMindMapToServer } from '@/lib/sync'

type NodeStatus = 'known' | 'near' | 'far'
type KnowledgeNode = {
  id: string
  title: string
  parent?: string
  status: NodeStatus
  mastery: number
  note: string
  x?: number
  y?: number
}
type MapData = {
  domainTitle: string
  summary: string
  updatedAt: string
  nodes: KnowledgeNode[]
}

const MAP_KEY = 'wai_map_unified'

function statusMeta(status: NodeStatus) {
  if (status === 'known') {
    return {
      text: 'text-[var(--text)]',
      bg: 'bg-[var(--accent)]/30',
      border: 'border-[var(--accent)]/55',
      glow: 'shadow-[0_0_24px_var(--glow)]',
      stroke: 'var(--accent)',
      fill: 'color-mix(in srgb, var(--accent) 35%, transparent)',
      z: 30,
    }
  }
  if (status === 'near') {
    return {
      text: 'text-[var(--text)]/90',
      bg: 'bg-[var(--accent2)]/15',
      border: 'border-[var(--accent)]/30',
      glow: 'shadow-[0_0_12px_var(--glow)]',
      stroke: 'color-mix(in srgb, var(--accent) 55%, var(--muted))',
      fill: 'color-mix(in srgb, var(--accent) 12%, transparent)',
      z: 20,
    }
  }
  return {
    text: 'text-[var(--muted)]',
    bg: 'bg-[var(--card)]/80',
    border: 'border-[var(--border)]',
    glow: '',
    stroke: 'var(--border)',
    fill: 'color-mix(in srgb, var(--muted) 8%, transparent)',
    z: 10,
  }
}

function layoutRadial(nodes: KnowledgeNode[]) {
  const children = new Map<string, KnowledgeNode[]>()
  nodes.forEach((n) => {
    const p = n.parent || '__root__'
    if (!children.has(p)) children.set(p, [])
    children.get(p)!.push(n)
  })
  const placed = new Map<string, { x: number; y: number }>()
  const root = nodes.find((n) => n.id === 'mind') || nodes[0]
  if (!root) return nodes
  placed.set(root.id, { x: 0, y: 0 })

  const radiusOf = (n: KnowledgeNode, depth: number) => {
    if (n.status === 'known') return 100 + depth * 58
    if (n.status === 'near') return 138 + depth * 68
    return 185 + depth * 78
  }

  function place(parentId: string, baseAngle: number, depth: number) {
    const kids = (children.get(parentId) || []).filter((k) => k.id !== root!.id)
    if (!kids.length) return
    const parentPos = placed.get(parentId) || { x: 0, y: 0 }
    const spread = depth === 0 ? Math.PI * 2 : Math.PI * 1.15
    const start = baseAngle - spread / 2
    kids.forEach((kid, i) => {
      const angle =
        kids.length === 1 && depth > 0
          ? baseAngle
          : start + (spread * (i + 0.5)) / kids.length
      // کمی جابه‌جایی ارگانیک مثل شبکه عصبی
      const jitter = ((kid.id.charCodeAt(0) % 7) - 3) * 4
      const r = radiusOf(kid, depth) + jitter
      placed.set(kid.id, {
        x: parentPos.x + Math.cos(angle) * r,
        y: parentPos.y + Math.sin(angle) * r,
      })
      place(kid.id, angle, depth + 1)
    })
  }

  place(root.id, -Math.PI / 2, 0)
  nodes.forEach((n, i) => {
    if (!placed.has(n.id)) {
      const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2
      placed.set(n.id, { x: Math.cos(a) * 200, y: Math.sin(a) * 200 })
    }
  })
  return nodes.map((n) => ({ ...n, x: placed.get(n.id)?.x ?? 0, y: placed.get(n.id)?.y ?? 0 }))
}

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  // کنترل منحنی نرم شبیه سیناپس
  const dx = x2 - x1
  const dy = y2 - y1
  const cx = mx - dy * 0.18
  const cy = my + dx * 0.18
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

function mergeMaps(local: MapData | null, remote: MapData | null): MapData | null {
  if (!local && !remote) return null
  if (!local) return remote
  if (!remote) return local
  const localT = Date.parse(local.updatedAt || '') || 0
  const remoteT = Date.parse(remote.updatedAt || '') || 0
  // هرگز نقشه را خالی نکن؛ غنی‌تر / جدیدتر را نگه دار
  const primary = remoteT > localT ? remote : local
  const secondary = remoteT > localT ? local : remote
  const byId = new Map<string, KnowledgeNode>()
  ;(secondary.nodes || []).forEach((n) => byId.set(n.id, n))
  ;(primary.nodes || []).forEach((n) => {
    const prev = byId.get(n.id)
    if (!prev) byId.set(n.id, n)
    else {
      byId.set(n.id, {
        ...prev,
        ...n,
        mastery: Math.max(prev.mastery || 0, n.mastery || 0),
        status:
          ['known', 'near', 'far'].indexOf(n.status) <= ['known', 'near', 'far'].indexOf(prev.status)
            ? prev.status === 'known' || n.status === 'known'
              ? 'known'
              : prev.status === 'near' || n.status === 'near'
                ? 'near'
                : n.status
            : n.status === 'known' || prev.status === 'known'
              ? 'known'
              : n.status === 'near' || prev.status === 'near'
                ? 'near'
                : 'far',
      })
    }
  })
  return {
    domainTitle: primary.domainTitle || secondary.domainTitle || 'mind',
    summary: primary.summary || secondary.summary || '',
    updatedAt: new Date(Math.max(localT, remoteT)).toISOString() || primary.updatedAt,
    nodes: Array.from(byId.values()),
  }
}

export default function KnowledgeMapPage() {
  const { dict, dir } = useLocale()
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<KnowledgeNode | null>(null)
  const [scale, setScale] = useState(0.85)
  const pinchStart = useRef<number | null>(null)
  const scaleStart = useRef(1)

  const persist = (data: MapData) => {
    try {
      localStorage.setItem(MAP_KEY, JSON.stringify(data))
    } catch {
      /* ignore quota */
    }
    // همگام با سرور — حذف نمی‌شود
    void saveMindMapToServer(data)
  }

  const load = async () => {
    let local: MapData | null = null
    try {
      const raw = localStorage.getItem(MAP_KEY)
      if (raw) local = JSON.parse(raw)
    } catch {
      local = null
    }
    let remote: MapData | null = null
    try {
      remote = (await loadMindMapFromServer()) as MapData | null
    } catch {
      remote = null
    }
    const merged = mergeMaps(local, remote)
    if (merged && merged.nodes?.length) {
      setMap(merged)
      // اگر سرور عقب‌تر بود، آخرین نسخه را دوباره ذخیره کن
      if (local && (!remote || (Date.parse(local.updatedAt || '') || 0) >= (Date.parse(remote.updatedAt || '') || 0))) {
        void saveMindMapToServer(local)
      }
    } else if (local?.nodes?.length) {
      setMap(local)
    } else if (remote?.nodes?.length) {
      setMap(remote)
      try {
        localStorage.setItem(MAP_KEY, JSON.stringify(remote))
      } catch {}
    }
    // اگر هیچ‌کدام نبود null می‌ماند — هرگز عمداً پاک نمی‌کنیم
  }

  useEffect(() => {
    void load()
    const onCustom = () => void load()
    window.addEventListener('wai-map-updated', onCustom)
    const t = setInterval(() => void load(), 4000)
    return () => {
      window.removeEventListener('wai-map-updated', onCustom)
      clearInterval(t)
    }
  }, [])

  const laidOut = useMemo(() => (map ? layoutRadial(map.nodes) : []), [map])
  const edges = useMemo(() => {
    const byId = new Map(laidOut.map((n) => [n.id, n]))
    return laidOut
      .filter((n) => n.parent && byId.has(n.parent))
      .map((n) => ({ from: byId.get(n.parent!)!, to: n }))
  }, [laidOut])

  const stats = useMemo(() => {
    if (!map) return { known: 0, near: 0, far: 0 }
    return {
      known: map.nodes.filter((n) => n.status === 'known').length,
      near: map.nodes.filter((n) => n.status === 'near').length,
      far: map.nodes.filter((n) => n.status === 'far').length,
    }
  }, [map])

  const sorted = useMemo(() => {
    const rank = { far: 0, near: 1, known: 2 }
    return [...laidOut].sort((a, b) => rank[a.status] - rank[b.status])
  }, [laidOut])

  const zoomBy = (delta: number) => {
    setScale((s) => Math.min(2.2, Math.max(0.45, s + delta)))
  }

  return (
    <main dir={dir} className="min-h-screen overflow-hidden" style={{ color: 'var(--text)', background: 'var(--bg0)' }}>
      {/* بافت نرم مغزگونه با رنگ‌های تم */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[420px] rounded-[50%] blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[380px] h-[380px] rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, var(--accent2) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 -left-20 w-[280px] h-[280px] rounded-full blur-3xl opacity-15"
          style={{ background: 'radial-gradient(circle, var(--glow) 0%, transparent 70%)' }}
        />
      </div>

      <header className="relative z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg0)_80%,transparent)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm sm:text-base font-semibold">{dict.mapTitle}</h1>
            <p className="text-[10px] text-[var(--accent)]">{dict.mapSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => zoomBy(0.12)} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]" aria-label="zoom in">
              <ZoomIn className="w-4 h-4 text-[var(--accent)]" />
            </button>
            <button type="button" onClick={() => zoomBy(-0.12)} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]" aria-label="zoom out">
              <ZoomOut className="w-4 h-4 text-[var(--accent)]" />
            </button>
            <Link href="/" className="text-sm text-[var(--muted)] inline-flex items-center gap-1">
              <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              {dict.home}
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-3 pt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--accent)]/15 text-[var(--accent)]">
          <Eye className="w-3 h-3 inline ml-1" /> {dict.mapKnown} ({stats.known})
        </span>
        <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
          <Sparkles className="w-3 h-3 inline ml-1" /> {dict.mapNear} ({stats.near})
        </span>
        <span className="px-2 py-1 rounded-full border border-[var(--border)] text-[var(--muted)]">
          <EyeOff className="w-3 h-3 inline ml-1" /> {dict.mapFar} ({stats.far})
        </span>
        <span className="px-2 py-1 rounded-full border border-[var(--border)] text-[var(--muted)]">
          {dir === 'ltr' ? 'Map updates every 5 messages' : dir === 'rtl' && dict.brandName ? 'نقشه هر ۵ پیام' : 'نقشه هر ۵ پیام'}
        </span>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-2 py-3">
        <div
          className="relative w-full h-[74vh] min-h-[440px] rounded-3xl border border-[var(--border)] overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--card) 88%, var(--accent) 12%) 0%, var(--bg0) 72%)',
          }}
          onWheel={(e) => {
            e.preventDefault()
            zoomBy(e.deltaY > 0 ? -0.06 : 0.06)
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
              const next = scaleStart.current * (dist / pinchStart.current)
              setScale(Math.min(2.2, Math.max(0.45, next)))
            }
          }}
          onTouchEnd={() => {
            pinchStart.current = null
          }}
        >
          {/* هسته عصبی مرکزی */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className="w-40 h-40 rounded-full blur-2xl opacity-40"
              style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
            />
          </div>

          {!map || !map.nodes?.length ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-sm space-y-3">
                <p className="text-sm text-[var(--muted)] leading-relaxed">{dict.mapEmpty}</p>
                <Link href="/start" className="btn-primary inline-flex px-4 py-2 text-sm">
                  {dict.startChat}
                </Link>
              </div>
            </div>
          ) : (
            <div
              className="absolute left-1/2 top-1/2 will-change-transform"
              style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
            >
              <svg width="900" height="900" viewBox="-450 -450 900 900" className="overflow-visible pointer-events-none">
                <defs>
                  <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {edges.map((e, i) => {
                  const meta = statusMeta(e.to.status)
                  return (
                    <path
                      key={i}
                      d={curvePath(e.from.x || 0, e.from.y || 0, e.to.x || 0, e.to.y || 0)}
                      fill="none"
                      stroke={meta.stroke}
                      strokeWidth={e.to.status === 'known' ? 2.2 : e.to.status === 'near' ? 1.4 : 1}
                      strokeOpacity={e.to.status === 'far' ? 0.25 : 0.55}
                      strokeLinecap="round"
                    />
                  )
                })}
              </svg>

              {sorted.map((n) => {
                const meta = statusMeta(n.status)
                const isRoot = n.id === 'mind'
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelected(n)}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: n.x, top: n.y, zIndex: meta.z }}
                  >
                    {isRoot && (
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-50"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                    {n.status === 'far' && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-xl pointer-events-none bg-[var(--muted)]/25" />
                    )}
                    <div
                      className={`relative px-3 py-2 rounded-2xl border backdrop-blur-md ${meta.bg} ${meta.border} ${meta.glow} ${
                        isRoot ? 'scale-110 font-bold' : ''
                      }`}
                    >
                      <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${meta.text}`}>
                        {n.title}
                      </span>
                      {typeof n.mastery === 'number' && n.status !== 'far' && (
                        <div className="mt-1.5 w-16 h-1 rounded-full bg-[var(--border)] overflow-hidden mx-auto">
                          <div
                            className="h-full rounded-full bg-[var(--accent)]"
                            style={{ width: `${Math.min(100, Math.max(0, n.mastery))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-[var(--muted)] pointer-events-none px-3">
            {dict.mapHint} · {dir === 'ltr' ? 'Pan disabled · zoom only' : 'بدون جابه‌جایی · فقط زوم'}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed bottom-0 inset-x-0 z-40 p-4"
          >
            <div className="max-w-md mx-auto rounded-2xl border border-[var(--border)] bg-[var(--card-solid,var(--card))] backdrop-blur-xl p-4 shadow-2xl">
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{selected.title}</h2>
                  <span className="text-[10px] text-[var(--accent)]">
                    {selected.status === 'known'
                      ? dict.mapKnown
                      : selected.status === 'near'
                        ? dict.mapNear
                        : dict.mapFar}
                  </span>
                </div>
                <button type="button" className="text-sm text-[var(--muted)]" onClick={() => setSelected(null)}>
                  ✕
                </button>
              </div>
              {selected.note && (
                <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{selected.note}</p>
              )}
              {typeof selected.mastery === 'number' && (
                <p className="text-xs text-[var(--accent)] mt-2">{Math.round(selected.mastery)}%</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
