'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useEffect, useMemo, useRef, useState } from 'react'
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

function rankStatus(s: NodeStatus) {
  if (s === 'known') return 2
  if (s === 'near') return 1
  return 0
}

function bestStatus(a: NodeStatus, b: NodeStatus): NodeStatus {
  return rankStatus(a) >= rankStatus(b) ? a : b
}

function ensureMind(nodes: KnowledgeNode[]): KnowledgeNode[] {
  const list = Array.isArray(nodes) ? [...nodes] : []
  if (!list.some((n) => n.id === 'mind')) {
    list.unshift({
      id: 'mind',
      title: 'ذهن',
      status: 'known',
      mastery: 55,
      note: 'مرکز آگاهی',
    })
  }
  return list.map((n) => ({
    ...n,
    title: n.title || n.id,
    status: (n.status as NodeStatus) || 'far',
    mastery: typeof n.mastery === 'number' ? n.mastery : n.status === 'known' ? 60 : n.status === 'near' ? 30 : 5,
    note: n.note || '',
  }))
}

function layoutBrain(nodesIn: KnowledgeNode[]) {
  const nodes = ensureMind(nodesIn)
  const root = nodes.find((n) => n.id === 'mind')!
  const others = nodes.filter((n) => n.id !== 'mind')

  // گروه‌بندی بر اساس status برای حلقه‌های مغز
  const known = others.filter((n) => n.status === 'known')
  const near = others.filter((n) => n.status === 'near')
  const far = others.filter((n) => n.status === 'far')

  const placed = new Map<string, { x: number; y: number }>()
  placed.set('mind', { x: 0, y: 0 })

  const placeRing = (arr: KnowledgeNode[], radius: number, startAngle = -Math.PI / 2) => {
    const n = Math.max(arr.length, 1)
    arr.forEach((node, i) => {
      const a = startAngle + (i * 2 * Math.PI) / n
      // فاصله اضافه برای جلوگیری از روی‌هم‌افتادگی
      const r = radius + (i % 3) * 12
      placed.set(node.id, { x: Math.cos(a) * r, y: Math.sin(a) * r })
    })
  }

  placeRing(known, 120, -Math.PI / 2)
  placeRing(near, 210, -Math.PI / 2 + 0.2)
  placeRing(far, 300, -Math.PI / 2 + 0.35)

  // اگر parent داشت نزدیک‌تر به parent
  others.forEach((n) => {
    if (n.parent && placed.has(n.parent) && n.parent !== 'mind') {
      const p = placed.get(n.parent)!
      const cur = placed.get(n.id) || { x: 0, y: 0 }
      placed.set(n.id, {
        x: (cur.x + p.x * 0.35) / 1.35,
        y: (cur.y + p.y * 0.35) / 1.35,
      })
    }
  })

  // جداسازی ساده برخورد
  const ids = nodes.map((n) => n.id)
  for (let iter = 0; iter < 8; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = placed.get(ids[i])!
        const b = placed.get(ids[j])!
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dist = Math.hypot(dx, dy) || 0.1
        const minDist = ids[i] === 'mind' || ids[j] === 'mind' ? 90 : 70
        if (dist < minDist) {
          const push = ((minDist - dist) / dist) * 0.5
          if (ids[i] !== 'mind') {
            a.x -= dx * push
            a.y -= dy * push
          }
          if (ids[j] !== 'mind') {
            b.x += dx * push
            b.y += dy * push
          }
        }
      }
    }
  }

  return nodes.map((n) => ({ ...n, x: placed.get(n.id)?.x ?? 0, y: placed.get(n.id)?.y ?? 0 }))
}

function mergeMaps(local: MapData | null, remote: MapData | null): MapData | null {
  if (!local && !remote) return null
  if (!local) return remote ? { ...remote, nodes: ensureMind(remote.nodes || []) } : null
  if (!remote) return { ...local, nodes: ensureMind(local.nodes || []) }

  const byId = new Map<string, KnowledgeNode>()
  for (const n of ensureMind(local.nodes || [])) byId.set(n.id, n)
  for (const n of ensureMind(remote.nodes || [])) {
    const prev = byId.get(n.id)
    if (!prev) byId.set(n.id, n)
    else {
      byId.set(n.id, {
        ...prev,
        ...n,
        title: n.title || prev.title,
        mastery: Math.max(prev.mastery || 0, n.mastery || 0),
        status: bestStatus(prev.status, n.status),
        note: (n.note && n.note.length >= (prev.note || '').length ? n.note : prev.note) || '',
        parent: n.parent || prev.parent,
      })
    }
  }

  const localT = Date.parse(local.updatedAt || '') || 0
  const remoteT = Date.parse(remote.updatedAt || '') || 0
  return {
    domainTitle: remote.domainTitle || local.domainTitle || 'نقشه کامل ذهن',
    summary: remote.summary || local.summary || '',
    updatedAt: new Date(Math.max(localT, remoteT, Date.now())).toISOString(),
    nodes: ensureMind(Array.from(byId.values())),
  }
}

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const cx = mx - dy * 0.16
  const cy = my + dx * 0.16
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

export default function KnowledgeMapPage() {
  const { dict, dir } = useLocale()
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<KnowledgeNode | null>(null)
  const [scale, setScale] = useState(0.9)
  const [recovering, setRecovering] = useState(false)
  const pinchStart = useRef<number | null>(null)
  const scaleStart = useRef(1)

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
    if (merged?.nodes?.length) {
      setMap(merged)
      try {
        localStorage.setItem(MAP_KEY, JSON.stringify(merged))
      } catch {}
      // اگر محلی غنی‌تر بود به سرور برگردان
      if (local?.nodes?.length && (!remote?.nodes?.length || local.nodes.length >= (remote.nodes?.length || 0))) {
        void saveMindMapToServer(merged)
      }
    } else if (local?.nodes?.length) {
      setMap({ ...local, nodes: ensureMind(local.nodes) })
    } else if (remote?.nodes?.length) {
      const r = { ...remote, nodes: ensureMind(remote.nodes) }
      setMap(r)
      try {
        localStorage.setItem(MAP_KEY, JSON.stringify(r))
      } catch {}
    }
  }

  const doRecover = async () => {
    setRecovering(true)
    try {
      await recoverEverything()
      await load()
    } finally {
      setRecovering(false)
    }
  }

  useEffect(() => {
    void doRecover()
    const onCustom = () => void load()
    window.addEventListener('wai-map-updated', onCustom)
    return () => window.removeEventListener('wai-map-updated', onCustom)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const laidOut = useMemo(() => (map ? layoutBrain(map.nodes) : []), [map])
  const edges = useMemo(() => {
    const byId = new Map(laidOut.map((n) => [n.id, n]))
    return laidOut
      .filter((n) => n.id !== 'mind')
      .map((n) => {
        const parentId = n.parent && byId.has(n.parent) ? n.parent : 'mind'
        return { from: byId.get(parentId)!, to: n }
      })
      .filter((e) => e.from && e.to)
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
    return [...laidOut].sort((a, b) => rankStatus(a.status) - rankStatus(b.status))
  }, [laidOut])

  const zoomBy = (d: number) => setScale((s) => Math.min(2.4, Math.max(0.4, s + d)))

  const nodeStyle = (status: NodeStatus, isRoot: boolean) => {
    if (isRoot) {
      return {
        cls: 'bg-[var(--accent)]/35 border-[var(--accent)] shadow-[0_0_30px_var(--glow)]',
        text: 'text-[var(--text)] font-bold',
      }
    }
    if (status === 'known') {
      return {
        cls: 'bg-[var(--accent)]/25 border-[var(--accent)]/60 shadow-[0_0_18px_var(--glow)]',
        text: 'text-[var(--text)]',
      }
    }
    if (status === 'near') {
      return {
        cls: 'bg-[var(--accent2)]/15 border-[var(--accent)]/35',
        text: 'text-[var(--text)]/90',
      }
    }
    return {
      cls: 'bg-[var(--card)] border-[var(--border)] opacity-80',
      text: 'text-[var(--muted)]',
    }
  }

  return (
    <main dir={dir} className="min-h-screen overflow-hidden" style={{ color: 'var(--text)', background: 'var(--bg0)' }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[480px] rounded-[50%] blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 68%)' }}
        />
      </div>

      <header className="relative z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg0)_82%,transparent)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-sm sm:text-base font-semibold">{dict.mapTitle}</h1>
            <p className="text-[10px] text-[var(--accent)]">{dict.mapSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void doRecover()} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]" title="recover">
              <RefreshCw className={`w-4 h-4 text-[var(--accent)] ${recovering ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={() => zoomBy(0.12)} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <ZoomIn className="w-4 h-4 text-[var(--accent)]" />
            </button>
            <button type="button" onClick={() => zoomBy(-0.12)} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)]">
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
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-2 py-3">
        <div
          className="relative w-full h-[74vh] min-h-[460px] rounded-3xl border border-[var(--border)] overflow-hidden"
          style={{
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--card) 90%, var(--accent) 10%) 0%, var(--bg0) 75%)',
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
              setScale(Math.min(2.4, Math.max(0.4, scaleStart.current * (dist / pinchStart.current))))
            }
          }}
          onTouchEnd={() => {
            pinchStart.current = null
          }}
        >
          {!map || !map.nodes?.length ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-sm space-y-3">
                <p className="text-sm text-[var(--muted)] leading-relaxed">{dict.mapEmpty}</p>
                <button type="button" onClick={() => void doRecover()} className="btn-secondary px-4 py-2 text-sm">
                  {recovering ? '...' : dir === 'ltr' ? 'Restore data' : 'بازیابی داده'}
                </button>
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
              <svg width="1000" height="1000" viewBox="-500 -500 1000 1000" className="overflow-visible pointer-events-none">
                {edges.map((e, i) => (
                  <path
                    key={i}
                    d={curvePath(e.from.x || 0, e.from.y || 0, e.to.x || 0, e.to.y || 0)}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={e.to.status === 'known' ? 2.4 : e.to.status === 'near' ? 1.5 : 1}
                    strokeOpacity={e.to.status === 'far' ? 0.22 : 0.5}
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              {sorted.map((n) => {
                const isRoot = n.id === 'mind'
                const st = nodeStyle(n.status, isRoot)
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelected(n)}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: n.x, top: n.y, zIndex: isRoot ? 40 : 10 + rankStatus(n.status) }}
                  >
                    {isRoot && (
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-50"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                    {n.status === 'far' && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-xl pointer-events-none bg-[var(--muted)]/20" />
                    )}
                    <div className={`relative px-3 py-2 rounded-2xl border backdrop-blur-md ${st.cls} ${isRoot ? 'scale-110' : ''}`}>
                      <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${st.text}`}>{n.title}</span>
                      {n.status !== 'far' && (
                        <div className="mt-1.5 w-16 h-1 rounded-full bg-[var(--border)] overflow-hidden mx-auto">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, n.mastery || 0)}%` }} />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-[var(--muted)] pointer-events-none px-3">
            {dict.mapHint} · {dir === 'ltr' ? 'Zoom only' : 'فقط زوم'}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="fixed bottom-0 inset-x-0 z-40 p-4">
            <div className="max-w-md mx-auto rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] backdrop-blur-xl p-4 shadow-2xl">
              <div className="flex justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{selected.title}</h2>
                  <span className="text-[10px] text-[var(--accent)]">
                    {selected.status === 'known' ? dict.mapKnown : selected.status === 'near' ? dict.mapNear : dict.mapFar}
                  </span>
                </div>
                <button type="button" className="text-sm text-[var(--muted)]" onClick={() => setSelected(null)}>
                  ✕
                </button>
              </div>
              {selected.note && <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">{selected.note}</p>}
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
