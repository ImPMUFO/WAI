'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  Compass,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  ZoomIn,
  ZoomOut,
  LocateFixed,
} from 'lucide-react'

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
  domain: string
  domainTitle: string
  summary: string
  updatedAt: string
  nodes: KnowledgeNode[]
}

const domains = [
  { id: 'philosophy', title: 'فلسفه' },
  { id: 'programming', title: 'برنامه‌نویسی' },
  { id: 'history', title: 'تاریخ' },
  { id: 'psychology', title: 'روان‌شناسی' },
]

function mapKey(domain: string) {
  return `wai_map_${domain}`
}

function statusMeta(status: NodeStatus) {
  if (status === 'known') {
    return {
      label: 'معلوم و آشکار',
      icon: Eye,
      text: 'text-white',
      bg: 'bg-emerald-500/25',
      border: 'border-emerald-300/50',
      glow: 'shadow-[0_0_30px_rgba(52,211,153,0.4)]',
      ring: 'rgba(52,211,153,0.35)',
    }
  }
  if (status === 'near') {
    return {
      label: 'نزدیک · در مه',
      icon: Sparkles,
      text: 'text-white/85',
      bg: 'bg-teal-500/15',
      border: 'border-teal-300/30',
      glow: 'shadow-[0_0_22px_rgba(45,212,191,0.2)]',
      ring: 'rgba(45,212,191,0.2)',
    }
  }
  return {
    label: 'دور · در ابر',
    icon: Lock,
    text: 'text-white/35',
    bg: 'bg-slate-500/10',
    border: 'border-white/10',
    glow: '',
    ring: 'rgba(148,163,184,0.12)',
  }
}

/** چیدمان شعاعی: معلومات نزدیک مرکز، ناشناخته‌ها بیرونی */
function layoutRadial(nodes: KnowledgeNode[]) {
  const cx = 0
  const cy = 0
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const children = new Map<string, KnowledgeNode[]>()

  nodes.forEach((n) => {
    const p = n.parent || '__root__'
    if (!children.has(p)) children.set(p, [])
    children.get(p)!.push(n)
  })

  const placed = new Map<string, { x: number; y: number }>()

  const root = nodes.find((n) => n.id === 'root') || nodes[0]
  if (!root) return nodes

  placed.set(root.id, { x: cx, y: cy })

  const baseRadius = (status: NodeStatus, mastery: number) => {
    if (status === 'known') return 90 + (100 - mastery) * 0.35
    if (status === 'near') return 170 + (55 - Math.min(mastery, 55)) * 0.8
    return 270 + Math.random() * 20
  }

  function placeChildren(parentId: string, parentAngle: number, depth: number) {
    const kids = children.get(parentId) || []
    if (!kids.length) return
    const parentPos = placed.get(parentId) || { x: 0, y: 0 }
    const spread = Math.PI * 1.4
    const start = parentAngle - spread / 2

    kids.forEach((kid, i) => {
      if (kid.id === root.id) return
      const angle = kids.length === 1 ? parentAngle : start + (spread * (i + 0.5)) / kids.length
      const r = baseRadius(kid.status, kid.mastery) * (0.75 + depth * 0.35)
      const x = parentPos.x + Math.cos(angle) * r
      const y = parentPos.y + Math.sin(angle) * r
      placed.set(kid.id, { x, y })
      placeChildren(kid.id, angle, depth + 1)
    })
  }

  // لایه اول از root
  const first = (children.get(root.id) || []).filter((n) => n.id !== root.id)
  first.forEach((kid, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(first.length, 1)
    const r = baseRadius(kid.status, kid.mastery)
    placed.set(kid.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r })
    placeChildren(kid.id, angle, 1)
  })

  // اگر کسی جا نگرفت
  nodes.forEach((n, i) => {
    if (!placed.has(n.id)) {
      const angle = (i / nodes.length) * Math.PI * 2
      const r = baseRadius(n.status, n.mastery)
      placed.set(n.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r })
    }
  })

  return nodes.map((n) => ({
    ...n,
    x: placed.get(n.id)?.x ?? 0,
    y: placed.get(n.id)?.y ?? 0,
  }))
}

export default function KnowledgeMapPage() {
  const [domain, setDomain] = useState('philosophy')
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<KnowledgeNode | null>(null)
  const [scale, setScale] = useState(0.85)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const loadMap = (d: string) => {
    const raw = localStorage.getItem(mapKey(d))
    if (!raw) {
      setMap(null)
      return
    }
    try {
      setMap(JSON.parse(raw))
    } catch {
      setMap(null)
    }
  }

  useEffect(() => {
    loadMap(domain)
    setSelected(null)
    setScale(0.85)
    setTx(0)
    setTy(0)
  }, [domain])

  // گوش دادن به به‌روزرسانی خودکار از صفحه ارزیابی
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === mapKey(domain)) loadMap(domain)
    }
    const onCustom = () => loadMap(domain)
    window.addEventListener('storage', onStorage)
    window.addEventListener('wai-map-updated', onCustom)
    const timer = setInterval(() => loadMap(domain), 2500)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('wai-map-updated', onCustom)
      clearInterval(timer)
    }
  }, [domain])

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

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    last.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setTx((v) => v + dx)
    setTy((v) => v + dy)
  }
  const onPointerUp = () => {
    dragging.current = false
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setScale((s) => Math.min(2.4, Math.max(0.35, s + delta)))
  }

  const resetView = () => {
    setScale(0.85)
    setTx(0)
    setTy(0)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#020617] via-[#031a1f] to-[#020617] rtl text-white overflow-hidden">
      <header className="relative z-30 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal-400" />
            <div>
              <h1 className="text-sm sm:text-base font-semibold">نقشه ذهن</h1>
              <p className="text-[10px] text-teal-400/70">خودکار · زنده · بدون مرز</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900">
                  {d.title}
                </option>
              ))}
            </select>

            <button onClick={() => setScale((s) => Math.min(2.4, s + 0.12))} className="p-1.5 rounded-lg bg-white/5 border border-white/10">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setScale((s) => Math.max(0.35, s - 0.12))} className="p-1.5 rounded-lg bg-white/5 border border-white/10">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={resetView} className="p-1.5 rounded-lg bg-white/5 border border-white/10" title="مرکز">
              <LocateFixed className="w-4 h-4" />
            </button>

            <Link href={`/assessment/${domain}`} className="text-xs text-teal-300 hover:text-teal-200">
              ادامه گفت‌وگو
            </Link>
            <Link href="/start" className="text-xs text-gray-400 hover:text-white inline-flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              بازگشت
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 pt-3 space-y-2 relative z-20">
        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
          <span className="px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 inline-flex items-center gap-1">
            <Eye className="w-3 h-3" /> معلوم ({stats.known})
          </span>
          <span className="px-2 py-1 rounded-full bg-teal-500/10 border border-teal-300/20 text-teal-100/80 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> نزدیک ({stats.near})
          </span>
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 inline-flex items-center gap-1">
            <EyeOff className="w-3 h-3" /> دور ({stats.far})
          </span>
        </div>
        {map?.summary && (
          <p className="text-[11px] sm:text-xs text-gray-300 leading-relaxed bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            {map.summary}
          </p>
        )}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-2 sm:px-4 py-3">
        <div
          ref={canvasRef}
          className="relative w-full h-[72vh] min-h-[420px] rounded-3xl border border-white/10 overflow-hidden touch-none cursor-grab active:cursor-grabbing bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.12),transparent_55%)]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {/* atmosphere */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-emerald-400/15 bg-emerald-400/5 blur-[1px]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-teal-400/10" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full border border-white/5" />
            <div className="absolute -top-10 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />
          </div>

          {!map && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-xs space-y-3">
                <p className="text-sm text-gray-300 leading-relaxed">
                  هنوز گفت‌وگویی ثبت نشده. با اولین پرسش‌وپاسخ، دایره معلوماتت اینجا شکل می‌گیرد.
                </p>
                <Link href={`/assessment/${domain}`} className="btn-primary inline-flex px-4 py-2 text-sm">
                  شروع گفت‌وگو
                </Link>
              </div>
            </div>
          )}

          {map && (
            <div
              className="absolute left-1/2 top-1/2 will-change-transform"
              style={{
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + \( {ty}px)) scale( \){scale})`,
              }}
            >
              <svg
                className="overflow-visible"
                width="900"
                height="900"
                viewBox="-450 -450 900 900"
                style={{ position: 'absolute', left: -450, top: -450 }}
              >
                {edges.map(({ from, to }) => {
                  const far = from.status === 'far' || to.status === 'far'
                  return (
                    <line
                      key={`\( {from.id}- \){to.id}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={
                        far
                          ? 'rgba(148,163,184,0.14)'
                          : to.status === 'near'
                            ? 'rgba(45,212,191,0.35)'
                            : 'rgba(52,211,153,0.5)'
                      }
                      strokeWidth={far ? 1 : 1.8}
                      strokeDasharray={far ? '4 6' : to.status === 'near' ? '6 4' : '0'}
                    />
                  )
                })}
              </svg>

              {laidOut.map((node, i) => {
                const meta = statusMeta(node.status)
                const Icon = meta.icon
                const isRoot = node.id === 'root'
                return (
                  <motion.button
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: node.x, top: node.y }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelected(node)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {(node.status === 'near' || node.status === 'far') && (
                      <span
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl pointer-events-none ${
                          node.status === 'near' ? 'w-24 h-24 bg-teal-400/20' : 'w-28 h-28 bg-slate-400/10'
                        }`}
                      />
                    )}
                    <div
                      className={`relative px-3 py-2 rounded-2xl border backdrop-blur-md transition-all ${meta.bg} ${meta.border} ${meta.glow} ${
                        node.status === 'far' ? 'opacity-40 blur-[1.5px] grayscale' : ''
                      } ${isRoot ? 'px-4 py-3 ring-1 ring-emerald-300/30' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${node.status === 'known' ? 'text-emerald-300' : node.status === 'near' ? 'text-teal-300' : 'text-slate-400'}`} />
                        <span
                          className={`text-xs sm:text-sm font-medium whitespace-nowrap ${meta.text}`}
                          style={
                            node.status === 'near'
                              ? {
                                  WebkitMaskImage: 'linear-gradient(90deg, black 65%, transparent 100%)',
                                  maskImage: 'linear-gradient(90deg, black 65%, transparent 100%)',
                                }
                              : undefined
                          }
                        >
                          {node.title}
                        </span>
                      </div>
                      {node.status !== 'far' && (
                        <div className="mt-1.5 w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${node.status === 'known' ? 'bg-emerald-400' : 'bg-teal-300/80'}`}
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

          <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-500 pointer-events-none">
            بکش برای جابه‌جایی · اسکرول / دکمه‌ها برای زوم
          </p>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 inset-x-0 z-40 p-4"
          >
            <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-[#0b1220]/95 backdrop-blur-xl p-4 shadow-2xl">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold">{selected.title}</h2>
                    <span className="text-[10px] text-teal-300/90">{statusMeta(selected.status).label}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {selected.note || 'هنوز یادداشتی ثبت نشده.'}
                  </p>
                  {selected.status !== 'far' && (
                    <p className="mt-2 text-xs text-emerald-300/90">تسلط تقریبی: {selected.mastery}٪</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 text-sm">
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
