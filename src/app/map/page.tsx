'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowRight,
  Compass,
  Eye,
  EyeOff,
  Lock,
  Sparkles,
  RefreshCw,
  Loader2,
} from 'lucide-react'

type NodeStatus = 'known' | 'near' | 'far'

type KnowledgeNode = {
  id: string
  title: string
  x: number
  y: number
  parent?: string
  status: NodeStatus
  mastery: number
  note: string
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
function chatKey(domain: string) {
  return `wai_chat_${domain}`
}

function statusMeta(status: NodeStatus) {
  if (status === 'known') {
    return {
      label: 'آشکار · می‌دانی',
      icon: Eye,
      color: 'text-emerald-300',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-400/40',
      glow: 'shadow-[0_0_28px_rgba(52,211,153,0.35)]',
      line: 'rgba(52,211,153,0.45)',
    }
  }
  if (status === 'near') {
    return {
      label: 'نزدیک · در مه یادگیری',
      icon: Sparkles,
      color: 'text-teal-200/90',
      bg: 'bg-teal-500/10',
      border: 'border-teal-300/25',
      glow: 'shadow-[0_0_22px_rgba(45,212,191,0.18)]',
      line: 'rgba(45,212,191,0.28)',
    }
  }
  return {
    label: 'دور · پنهان در ابر',
    icon: Lock,
    color: 'text-slate-400/60',
    bg: 'bg-slate-500/5',
    border: 'border-white/5',
    glow: '',
    line: 'rgba(148,163,184,0.12)',
  }
}

export default function KnowledgeMapPage() {
  const [domain, setDomain] = useState('philosophy')
  const [map, setMap] = useState<MapData | null>(null)
  const [selected, setSelected] = useState<KnowledgeNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(mapKey(domain))
    if (saved) {
      try {
        setMap(JSON.parse(saved))
        setSelected(null)
        setError(null)
        return
      } catch {
        // ignore
      }
    }
    setMap(null)
    setSelected(null)
  }, [domain])

  const edges = useMemo(() => {
    if (!map) return [] as { from: KnowledgeNode; to: KnowledgeNode }[]
    const byId = new Map(map.nodes.map((n) => [n.id, n]))
    return map.nodes
      .filter((n) => n.parent && byId.has(n.parent))
      .map((n) => ({ from: byId.get(n.parent!)!, to: n }))
  }, [map])

  const stats = useMemo(() => {
    if (!map) return { known: 0, near: 0, far: 0 }
    return {
      known: map.nodes.filter((n) => n.status === 'known').length,
      near: map.nodes.filter((n) => n.status === 'near').length,
      far: map.nodes.filter((n) => n.status === 'far').length,
    }
  }, [map])

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const rawChat = localStorage.getItem(chatKey(domain))
      const userName = localStorage.getItem('wai_user_name') || 'کاربر'
      if (!rawChat) {
        setError('هنوز گفت‌وگویی برای این حوزه ذخیره نشده. اول ارزیابی را انجام بده.')
        setLoading(false)
        return
      }
      const messages = JSON.parse(rawChat)
      if (!Array.isArray(messages) || messages.length < 2) {
        setError('گفت‌وگو خیلی کوتاه است. کمی بیشتر با ارزیاب حرف بزن، بعد نقشه را بساز.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, messages, userName }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تحلیل ناموفق بود')
      }
      localStorage.setItem(mapKey(domain), JSON.stringify(data.map))
      setMap(data.map)
      setSelected(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در تحلیل')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#020617] via-[#031a1f] to-[#020617] rtl text-white overflow-hidden">
      {/* Header */}
      <header className="relative z-30 border-b border-white/5 bg-[#020617]/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-teal-400" />
            <div>
              <h1 className="text-sm sm:text-base font-semibold">نقشه دانش</h1>
              <p className="text-[10px] sm:text-xs text-teal-400/70">من کیستم؟ پایگاه دانش</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs sm:text-sm text-white focus:outline-none focus:border-teal-500/40"
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id} className="bg-dark-900">
                  {d.title}
                </option>
              ))}
            </select>

            <button
              onClick={analyze}
              disabled={loading}
              className="btn-primary text-xs sm:text-sm px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {map ? 'به‌روزرسانی نقشه' : 'ساخت نقشه از گفت‌وگو'}
            </button>

            <Link
              href={`/assessment/${domain}`}
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors"
            >
              ادامه ارزیابی
            </Link>
            <Link
              href="/start"
              className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              بازگشت
            </Link>
          </div>
        </div>
      </header>

      {/* Legend + stats */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 pt-4 space-y-3">
        <div className="flex flex-wrap gap-2 text-[10px] sm:text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200">
            <Eye className="w-3 h-3" /> آشکار ({stats.known})
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-300/20 text-teal-100/80">
            <Sparkles className="w-3 h-3" /> نزدیک / مه ({stats.near})
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
            <EyeOff className="w-3 h-3" /> دور / ابر ({stats.far})
          </span>
        </div>

        {map?.summary && (
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-3xl bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            {map.summary}
            <span className="block mt-1 text-[10px] text-gray-500">
              آخرین به‌روزرسانی: {new Date(map.updatedAt).toLocaleString('fa-IR')}
            </span>
          </p>
        )}

        {error && (
          <p className="text-xs sm:text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {/* Canvas */}
      <div className="relative z-10 max-w-6xl mx-auto px-2 sm:px-4 py-4">
        <div className="relative w-full h-[68vh] min-h-[460px] rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_center,_rgba(13,148,136,0.10),_transparent_60%)] overflow-hidden">
          {/* atmosphere */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 left-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/5 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05),transparent_40%),radial-gradient(circle_at_70%_70%,rgba(45,212,191,0.06),transparent_35%)]" />
          </div>

          {!map && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <div className="max-w-sm space-y-3">
                <p className="text-gray-300 text-sm leading-relaxed">
                  هنوز نقشه‌ای برای این حوزه ساخته نشده.
                  <br />
                  اول گفت‌وگو کن، بعد اینجا «ساخت نقشه» را بزن.
                </p>
                <Link href={`/assessment/${domain}`} className="btn-primary inline-flex px-4 py-2 text-sm">
                  رفتن به ارزیابی
                </Link>
              </div>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-20">
              <div className="flex items-center gap-2 text-teal-200 text-sm">
                <Loader2 className="w-5 h-5 animate-spin" />
                در حال تحلیل گفت‌وگو و ترسیم نقشه...
              </div>
            </div>
          )}

          {map && (
            <>
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {edges.map(({ from, to }) => {
                  const far = from.status === 'far' || to.status === 'far'
                  const near = from.status === 'near' || to.status === 'near'
                  return (
                    <line
                      key={`\( {from.id}- \){to.id}`}
                      x1={`${from.x}%`}
                      y1={`${from.y}%`}
                      x2={`${to.x}%`}
                      y2={`${to.y}%`}
                      stroke={
                        far
                          ? 'rgba(148,163,184,0.12)'
                          : near
                            ? 'rgba(45,212,191,0.28)'
                            : 'rgba(52,211,153,0.45)'
                      }
                      strokeWidth={far ? 1 : 1.6}
                      strokeDasharray={far ? '4 6' : near ? '6 4' : '0'}
                    />
                  )
                })}
              </svg>

              {map.nodes.map((node, i) => {
                const meta = statusMeta(node.status)
                const Icon = meta.icon
                const isSelected = selected?.id === node.id

                return (
                  <motion.button
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: isSelected ? 1.06 : 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(node)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `\( {node.x}%`, top: ` \){node.y}%` }}
                  >
                    {(node.status === 'near' || node.status === 'far') && (
                      <span
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl pointer-events-none ${
                          node.status === 'near' ? 'w-28 h-28 bg-teal-400/15' : 'w-32 h-32 bg-slate-400/10'
                        }`}
                      />
                    )}

                    <div
                      className={`relative flex flex-col items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border backdrop-blur-md transition-all duration-500 ${meta.bg} ${meta.border} ${meta.glow} ${
                        isSelected ? 'ring-2 ring-teal-300/40' : ''
                      } ${
                        node.status === 'far'
                          ? 'opacity-35 blur-[2px] grayscale group-hover:opacity-55 group-hover:blur-[1px]'
                          : node.status === 'near'
                            ? 'opacity-85'
                            : 'opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        <span
                          className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                            node.status === 'known'
                              ? 'text-white'
                              : node.status === 'near'
                                ? 'text-white/80'
                                : 'text-white/40'
                          }`}
                          style={
                            node.status === 'near'
                              ? {
                                  WebkitMaskImage:
                                    'linear-gradient(90deg, black 60%, transparent 100%)',
                                  maskImage:
                                    'linear-gradient(90deg, black 60%, transparent 100%)',
                                }
                              : undefined
                          }
                        >
                          {node.title}
                        </span>
                      </div>

                      {node.status !== 'far' && (
                        <div className="w-16 sm:w-20 h-1 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              node.status === 'known' ? 'bg-emerald-400' : 'bg-teal-300/70'
                            }`}
                            style={{ width: `${node.mastery}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-0 inset-x-0 z-40 p-4 sm:p-6"
          >
            <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-[#0b1220]/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="text-base sm:text-lg font-semibold">{selected.title}</h2>
                    <span className={`text-[10px] sm:text-xs ${statusMeta(selected.status).color}`}>
                      {statusMeta(selected.status).label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.note}</p>
                  {selected.status !== 'far' && (
                    <p className="mt-2 text-xs text-teal-300/90">تسلط تقریبی: {selected.mastery}٪</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-sm px-2">
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
