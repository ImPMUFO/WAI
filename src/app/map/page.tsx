'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Compass, Eye, EyeOff, Lock, Sparkles } from 'lucide-react'
import { loadMindMapFromServer } from '@/lib/sync'

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
      label: 'معلوم',
      icon: Eye,
      text: 'text-[var(--text)]',
      bg: 'bg-[var(--accent)]/25',
      border: 'border-[var(--accent)]/45',
      glow: 'shadow-[0_0_28px_var(--glow)]',
      z: 30,
    }
  }
  if (status === 'near') {
    return {
      label: 'نزدیک',
      icon: Sparkles,
      text: 'text-[var(--text)]/90',
      bg: 'bg-[var(--accent)]/12',
      border: 'border-[var(--accent)]/30',
      glow: '',
      z: 20,
    }
  }
  return {
    label: 'افق',
    icon: Lock,
    text: 'text-[var(--muted)]',
    bg: 'bg-[var(--card)]',
    border: 'border-[var(--border)]',
    glow: '',
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
    if (n.status === 'known') return 95 + depth * 55
    if (n.status === 'near') return 130 + depth * 65
    return 175 + depth * 75
  }

  function place(parentId: string, baseAngle: number, depth: number) {
    const kids = (children.get(parentId) || []).filter((k) => k.id !== root!.id)
    if (!kids.length) return
    const parentPos = placed.get(parentId) || { x: 0, y: 0 }
    const spread = depth === 0 ? Math.PI * 2 : Math.PI * 1.1
    const start = baseAngle - spread / 2
    kids.forEach((kid, i) => {
      const angle =
        kids.length === 1 && depth > 0
          ? baseAngle
          : start + (spread * (i + 0.5)) / kids.length
      const r = radiusOf(kid, depth)
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
      const a = (i / nodes.length) * Math.PI * 2
      placed.set(n.id, { x: Math.cos(a) * 200, y: Math.sin(a) * 200 })
    }
  })

  return nodes.map((n) => ({ ...n, x: placed.get(n.id)?.x ?? 0, y: placed.get(n.id)?.y ?? 0 }))
}

export default function KnowledgeMapPage() {
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<KnowledgeNode | null>(null)
  const [scale, setScale] = useState(0.72)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const pinchStart = useRef<number | null>(null)
  const scaleStart = useRef(1)

    const load = () => {
    const raw = localStorage.getItem(MAP_KEY)
    if (raw) {
      try {
        setMap(JSON.parse(raw))
        return
      } catch {
        /* fallthrough */
      }
    }
    // اگر محلی نبود از سرور
    void loadMindMapFromServer().then((remote) => {
      if (remote) {
        try {
          localStorage.setItem(MAP_KEY, JSON.stringify(remote))
        } catch {}
        setMap(remote as any)
      } else {
        setMap(null)
      }
    })
  }

  useEffect(() => {
    load()
    const onCustom = () => load()
    window.addEventListener('wai-map-updated', onCustom)
    const t = setInterval(load, 2000)
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

  return (
    <main className="min-h-screen rtl overflow-hidden" style={{ color: 'var(--text)' }}>
      <header className="relative z-30 border-b border-[var(--border)] backdrop-blur-xl bg-[color-mix(in_srgb,var(--bg0)_80%,transparent)]">
        <div className="max-w-6xl mx-auto px-3 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h1 className="text-sm sm:text-base font-semibold">نقشه کامل ذهن</h1>
              <p className="text-[10px] text-[var(--accent)]">یک نقشه · همه دانش‌ها</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/start" className="text-[var(--accent)] hover:opacity-80">
              گفت‌وگوی جدید
            </Link>
            <Link href="/" className="text-[var(--muted)] hover:opacity-80 inline-flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              خانه
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 pt-3 space-y-2 relative z-20">
        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
          <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--accent)]/15 text-[var(--accent)]">
            <Eye className="w-3 h-3 inline ml-1" /> معلوم ({stats.known})
          </span>
          <span className="px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--card)]">
            <Sparkles className="w-3 h-3 inline ml-1" /> نزدیک ({stats.near})
          </span>
          <span className="px-2 py-1 rounded-full border border-[var(--border)] text-[var(--muted)]">
            <EyeOff className="w-3 h-3 inline ml-1" /> افق ({stats.far})
          </span>
        </div>
        {map?.summary && (
          <p className="text-[11px] sm:text-xs text-[var(--muted)] leading-relaxed border border-[var(--border)] rounded-xl px-3 py-2 bg-[var(--card)]">
            {map.summary}
          </p>
        )}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-2 py-3">
        <div
          className="relative w-full h-[74vh] min-h-[440px] rounded-3xl border border-[var(--border)] overflow-hidden touch-none cursor-grab active:cursor-grabbing"
          style={{
            background:
              'radial-gradient(circle at center, color-mix(in srgb, var(--accent) 12%, transparent), transparent 55%)',
          }}
          onPointerDown={(e) => {
            dragging.current = true
            last.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerMove={(e) => {
            if (!dragging.current) return
            setTx((v) => v + e.clientX - last.current.x)
            setTy((v) => v + e.clientY - last.current.y)
            last.current = { x: e.clientX, y: e.clientY }
          }}
          onPointerUp={() => {
            dragging.current = false
          }}
          onPointerCancel={() => {
            dragging.current = false
          }}
          onWheel={(e) => {
            e.preventDefault()
            setScale((s) => Math.min(2.5, Math.max(0.3, s + (e.deltaY > 0 ? -0.08 : 0.08))))
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX
              const dy = e.touches[0].clientY - e.touches[1].clientY
              pinchStart.current = Math.hypot(dx, dy)
              scaleStart.current = scale
              dragging.current = false
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && pinchStart.current) {
              const dx = e.touches[0].clientX - e.touches[1].clientX
              const dy = e.touches[0].clientY - e.touches[1].clientY
              const dist = Math.hypot(dx, dy)
              setScale(Math.min(2.5, Math.max(0.3, scaleStart.current * (dist / pinchStart.current))))
            }
          }}
          onTouchEnd={() => {
            pinchStart.current = null
          }}
        >
          {!map && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-sm space-y-3">
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  هنوز نقشه‌ای ساخته نشده. با اولین گفت‌وگو، دایرهٔ ذهن تو اینجا شکل می‌گیرد.
                </p>
                <Link href="/start" className="btn-primary inline-flex px-4 py-2 text-sm">
                  شروع گفت‌وگو
                </Link>
              </div>
            </div>
          )}

          {map && (
            <div
              className="absolute left-1/2 top-1/2 will-change-transform"
              style={{ transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})` }}
            >
              <svg
                className="overflow-visible pointer-events-none"
                width="1200"
                height="1200"
                viewBox="-600 -600 1200 1200"
                style={{ position: 'absolute', left: -600, top: -600 }}
              >
                {edges.map(({ from, to }) => (
                  <line
                    key={`${from.id}-${to.id}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={
                      to.status === 'far'
                        ? 'color-mix(in srgb, var(--muted) 25%, transparent)'
                        : 'color-mix(in srgb, var(--accent) 45%, transparent)'
                    }
                    strokeWidth={to.status === 'far' ? 1 : 1.6}
                    strokeDasharray={to.status === 'far' ? '3 7' : to.status === 'near' ? '5 4' : '0'}
                  />
                ))}
              </svg>

              {sorted.map((node, i) => {
                const meta = statusMeta(node.status)
                const Icon = meta.icon
                const isRoot = node.id === 'mind'
                return (
                  <motion.button
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.012 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: node.x, top: node.y, zIndex: meta.z }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelected(node)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {node.status === 'far' && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full blur-2xl pointer-events-none bg-[var(--muted)]/20" />
                    )}
                    <div
                      className={`relative px-3 py-2 rounded-2xl border backdrop-blur-md ${meta.bg} ${meta.border} ${meta.glow} ${
                        node.status === 'far' ? 'opacity-30 blur-[2px] grayscale' : node.status === 'near' ? 'opacity-95' : ''
                      } ${isRoot ? 'px-4 py-3 ring-1 ring-[var(--accent)]/30' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${meta.text}`}>
                          {node.title}
                        </span>
                      </div>
                      {node.status !== 'far' && (
                        <div className="mt-1.5 w-16 h-1 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--accent)]"
                            style={{ width: `${node.mastery}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}

          <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-[var(--muted)] pointer-events-none">
            بکش · دو انگشتی زوم کن · اسکرول ماوس
          </p>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-0 inset-x-0 z-40 p-4"
          >
            <div className="max-w-md mx-auto rounded-2xl border border-[var(--border)] bg-[var(--card-solid)] backdrop-blur-xl p-4 shadow-2xl">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold">{selected.title}</h2>
                    <span className="text-[10px] text-[var(--accent)]">{statusMeta(selected.status).label}</span>
                  </div>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {selected.note ||
                      (selected.status === 'far'
                        ? 'هنوز در افق مه است. با گفت‌وگو روشن می‌شود.'
                        : 'یادداشتی ثبت نشده.')}
                  </p>
                  {selected.status !== 'far' && (
                    <p className="mt-2 text-xs text-[var(--accent)]">تسلط تقریبی: {selected.mastery}٪</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-[var(--muted)] text-sm">
                  بستن
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
