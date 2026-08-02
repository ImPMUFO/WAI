'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Compass, Eye, EyeOff, Lock, Sparkles } from 'lucide-react'

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
  layer?: number
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

/** موضوعات افق کشف‌نشده — همیشه پشت معلومات دیده می‌شوند */
const horizonHints: Record<string, string[]> = {
  philosophy: ['هستی‌شناسی پیشرفته', 'فلسفه هنر', 'پدیدارشناسی', 'هرمنوتیک', 'فلسفه دین'],
  programming: ['معماری نرم‌افزار', 'هم‌زمانی', 'امنیت', 'کامپایلر', 'توزیع‌شده'],
  history: ['تاریخ اقتصادی', 'تاریخ اجتماعی', 'تاریخ فرهنگی', 'باستان‌شناسی', 'تاریخ شفاهی'],
  psychology: ['عصب‌روان‌شناسی', 'رشدی', 'بالینی', 'اجتماعی', 'روان‌سنجی'],
}

function mapKey(domain: string) {
  return `wai_map_${domain}`
}

function statusMeta(status: NodeStatus) {
  if (status === 'known') {
    return {
      label: 'معلوم و آشکار',
      icon: Eye,
      text: 'text-white',
      bg: 'bg-emerald-500/30',
      border: 'border-emerald-300/55',
      glow: 'shadow-[0_0_32px_rgba(52,211,153,0.45)]',
      z: 30,
    }
  }
  if (status === 'near') {
    return {
      label: 'نزدیک · کمی در مه',
      icon: Sparkles,
      text: 'text-white/92',
      bg: 'bg-teal-500/18',
      border: 'border-teal-300/35',
      glow: 'shadow-[0_0_18px_rgba(45,212,191,0.22)]',
      z: 20,
    }
  }
  return {
    label: 'دور · پنهان در ابر',
    icon: Lock,
    text: 'text-white/30',
    bg: 'bg-slate-500/10',
    border: 'border-white/8',
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
  const root = nodes.find((n) => n.id === 'root') || nodes[0]
  if (!root) return nodes

  placed.set(root.id, { x: 0, y: 0 })

  const radiusOf = (n: KnowledgeNode) => {
    if (n.status === 'known') return 70 + (100 - n.mastery) * 0.25
    if (n.status === 'near') return 145 + (50 - Math.min(n.mastery, 50)) * 0.5
    // لایه‌های دورتر پشت کشف‌شده‌ها
    const layer = n.layer ?? 1
    return 230 + layer * 70
  }

  function placeChildren(parentId: string, parentAngle: number, depth: number) {
    const kids = (children.get(parentId) || []).filter((k) => k.id !== root!.id)
    if (!kids.length) return
    const parentPos = placed.get(parentId) || { x: 0, y: 0 }
    const spread = Math.PI * 1.35
    const start = parentAngle - spread / 2

    kids.forEach((kid, i) => {
      const angle = kids.length === 1 ? parentAngle : start + (spread * (i + 0.5)) / kids.length
      const r = radiusOf(kid) * (0.7 + depth * 0.28)
      placed.set(kid.id, {
        x: parentPos.x + Math.cos(angle) * r,
        y: parentPos.y + Math.sin(angle) * r,
      })
      placeChildren(kid.id, angle, depth + 1)
    })
  }

  const first = (children.get(root.id) || []).filter((n) => n.id !== root.id)
  first.forEach((kid, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(first.length, 1)
    const r = radiusOf(kid)
    placed.set(kid.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r })
    placeChildren(kid.id, angle, 1)
  })

  nodes.forEach((n, i) => {
    if (!placed.has(n.id)) {
      const angle = (i / nodes.length) * Math.PI * 2
      const r = radiusOf(n)
      placed.set(n.id, { x: Math.cos(angle) * r, y: Math.sin(angle) * r })
    }
  })

  return nodes.map((n) => ({
    ...n,
    x: placed.get(n.id)?.x ?? 0,
    y: placed.get(n.id)?.y ?? 0,
  }))
}

/** همیشه ۲–۳ لایه موضوع ابری پشت معلومات اضافه می‌کند */
function withHorizonLayers(domain: string, nodes: KnowledgeNode[]): KnowledgeNode[] {
  const hints = horizonHints[domain] || horizonHints.philosophy
  const existing = new Set(nodes.map((n) => n.id))
  const extras: KnowledgeNode[] = []

  // حداقل چند far واقعی از گراف
  const farCount = nodes.filter((n) => n.status === 'far').length

  // لایه‌های افق (mystery) اگر کم است
  const need = Math.max(0, 3 - Math.min(farCount, 3))
  for (let i = 0; i < Math.max(3, need + 2); i++) {
    const id = `horizon_${i}`
    if (existing.has(id)) continue
    extras.push({
      id,
      title: hints[i % hints.length],
      status: 'far',
      mastery: 0,
      note: 'هنوز در افق دانش توست. با کشف بیشتر، از مه بیرون می‌آید.',
      parent: 'root',
      layer: 1 + (i % 3),
    })
  }

  // فقط اگر farهای واقعی کم‌اند، horizon را پررنگ‌تر نشان بده
  if (farCount >= 3) {
    return nodes.map((n) => (n.status === 'far' ? { ...n, layer: n.layer ?? 2 } : n))
  }

  return [...nodes, ...extras.slice(0, 4)]
}

export default function KnowledgeMapPage() {
  const [domain, setDomain] = useState('philosophy')
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<KnowledgeNode | null>(null)
  const [scale, setScale] = useState(0.9)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)

  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const pinchStart = useRef<number | null>(null)
  const scaleStart = useRef(1)

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
    setScale(0.9)
    setTx(0)
    setTy(0)
  }, [domain])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === mapKey(domain)) loadMap(domain)
    }
    const onCustom = () => loadMap(domain)
    window.addEventListener('storage', onStorage)
    window.addEventListener('wai-map-updated', onCustom)
    const timer = setInterval(() => loadMap(domain), 2000)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('wai-map-updated', onCustom)
      clearInterval(timer)
    }
  }, [domain])

  const laidOut = useMemo(() => {
    if (!map) return [] as KnowledgeNode[]
    const enriched = withHorizonLayers(domain, map.nodes)
    return layoutRadial(enriched)
  }, [map, domain])

  const edges = useMemo(() => {
    const byId = new Map(laidOut.map((n) => [n.id, n]))
    return laidOut
      .filter((n) => n.parent && byId.has(n.parent) && !n.id.startsWith('horizon_'))
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
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
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
    const delta = e.deltaY > 0 ? -0.09 : 0.09
    setScale((s) => Math.min(2.6, Math.max(0.35, s + delta)))
  }

  // پینچ زوم موبایل
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStart.current = Math.hypot(dx, dy)
      scaleStart.current = scale
      dragging.current = false
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      const next = scaleStart.current * (dist / pinchStart.current)
      setScale(Math.min(2.6, Math.max(0.35, next)))
    }
  }

  const onTouchEnd = () => {
    pinchStart.current = null
  }

  // مرتب‌سازی: far پایین، near وسط، known بالا
  const sortedNodes = useMemo(() => {
    const rank = { far: 0, near: 1, known: 2 }
    return [...laidOut].sort((a, b) => rank[a.status] - rank[b.status])
  }, [laidOut])

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#020617] via-[#031a1f] to-[#020617] rtl text-white overflow-hidden">
      <header className="relative z-30 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal-400" />
            <div>
              <h1 className="text-sm sm:text-base font-semibold">نقشه ذهن</h1>
              <p className="text-[10px] text-teal-400/70">بکش · پینچ کن · کشف کن</p>
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
          <span className="px-2 py-1 rounded-full bg-teal-500/10 border border-teal-300/20 text-teal-100/90 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> نزدیک ({stats.near})
          </span>
          <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 inline-flex items-center gap-1">
            <EyeOff className="w-3 h-3" /> افق کشف ({stats.far}+)
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
          className="relative w-full h-[74vh] min-h-[440px] rounded-3xl border border-white/10 overflow-hidden touch-none cursor-grab active:cursor-grabbing bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.14),transparent_55%)]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border border-emerald-400/20 bg-emerald-400/5" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full border border-teal-400/10" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-white/5" />
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
          </div>

          {!map && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-xs space-y-3">
                <p className="text-sm text-gray-300 leading-relaxed">
                  با اولین گفت‌وگو، دایره معلوماتت اینجا روشن می‌شود و افق‌های مه‌آلود پشت آن ظاهر می‌شوند.
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
                transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${scale})`,
              }}
            >
              <svg
                className="overflow-visible pointer-events-none"
                width="1000"
                height="1000"
                viewBox="-500 -500 1000 1000"
                style={{ position: 'absolute', left: -500, top: -500 }}
              >
                {edges.map(({ from, to }) => {
                  const far = to.status === 'far'
                  const near = to.status === 'near'
                  return (
                    <line
                      key={`${from.id}-${to.id}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={
                        far
                          ? 'rgba(148,163,184,0.12)'
                          : near
                            ? 'rgba(45,212,191,0.32)'
                            : 'rgba(52,211,153,0.5)'
                      }
                      strokeWidth={far ? 1 : near ? 1.4 : 1.9}
                      strokeDasharray={far ? '3 7' : near ? '5 4' : '0'}
                    />
                  )
                })}
              </svg>

              {sortedNodes.map((node, i) => {
                const meta = statusMeta(node.status)
                const Icon = meta.icon
                const isRoot = node.id === 'root'
                const isHorizon = node.id.startsWith('horizon_')

                return (
                  <motion.button
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.75 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: node.x, top: node.y, zIndex: meta.z }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelected(node)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {/* ابر قوی فقط برای far / horizon */}
                    {(node.status === 'far' || isHorizon) && (
                      <>
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-slate-400/15 blur-2xl pointer-events-none" />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/5 blur-xl pointer-events-none" />
                      </>
                    )}
                    {/* مه خیلی ملایم برای near */}
                    {node.status === 'near' && (
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-teal-300/10 blur-lg pointer-events-none" />
                    )}

                    <div
                      className={`relative px-3 py-2 rounded-2xl border backdrop-blur-md transition-all ${meta.bg} ${meta.border} ${meta.glow} ${
                        node.status === 'far' || isHorizon
                          ? 'opacity-[0.28] blur-[2.5px] grayscale contrast-75'
                          : node.status === 'near'
                            ? 'opacity-95'
                            : 'opacity-100'
                      } ${isRoot ? 'px-4 py-3 ring-1 ring-emerald-300/35' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            node.status === 'known'
                              ? 'text-emerald-300'
                              : node.status === 'near'
                                ? 'text-teal-300'
                                : 'text-slate-500'
                          }`}
                        />
                        <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${meta.text}`}>
                          {node.title}
                        </span>
                      </div>
                      {node.status !== 'far' && !isHorizon && (
                        <div className="mt-1.5 w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              node.status === 'known' ? 'bg-emerald-400' : 'bg-teal-300/85'
                            }`}
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

          <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-500 pointer-events-none px-4">
            با انگشت بکش · با دو انگشت زوم کن · اسکرول ماوس هم زوم می‌کند
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-semibold">{selected.title}</h2>
                    <span className="text-[10px] text-teal-300/90">{statusMeta(selected.status).label}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {selected.note ||
                      (selected.status === 'far'
                        ? 'این بخش هنوز در افق مه است. با گفت‌وگوی بیشتر روشن می‌شود.'
                        : 'هنوز یادداشتی ثبت نشده.')}
                  </p>
                  {selected.status !== 'far' && (
                    <p className="mt-2 text-xs text-emerald-300/90">تسلط تقریبی: {selected.mastery}٪</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 text-sm shrink-0">
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
