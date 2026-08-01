'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Compass, Eye, EyeOff, Lock, Sparkles } from 'lucide-react'

type NodeStatus = 'known' | 'near' | 'far'

type KnowledgeNode = {
  id: string
  title: string
  x: number // درصد افقی
  y: number // درصد عمودی
  status: NodeStatus
  mastery?: number // 0 تا 100 فقط برای known/near
  description: string
  parent?: string
}

const nodes: KnowledgeNode[] = [
  {
    id: 'root',
    title: 'فلسفه',
    x: 50,
    y: 12,
    status: 'known',
    mastery: 70,
    description: 'ریشهٔ این شاخه از معرفت؛ نقطه شروع نقشه تو.',
  },
  {
    id: 'logic',
    title: 'منطق',
    x: 22,
    y: 32,
    status: 'known',
    mastery: 82,
    description: 'ابزار درست اندیشیدن؛ پایه‌ای که بلدی.',
    parent: 'root',
  },
  {
    id: 'ethics',
    title: 'اخلاق',
    x: 50,
    y: 36,
    status: 'near',
    mastery: 35,
    description: 'نزدیک به فهم توست؛ با چند گام دیگر روشن‌تر می‌شود.',
    parent: 'root',
  },
  {
    id: 'epistemology',
    title: 'معرفت‌شناسی',
    x: 78,
    y: 32,
    status: 'near',
    mastery: 20,
    description: 'در هالهٔ یادگیری؛ بخشی از آن را می‌بینی، بخشی هنوز مبهم است.',
    parent: 'root',
  },
  {
    id: 'metaphysics',
    title: 'متافیزیک',
    x: 18,
    y: 58,
    status: 'far',
    description: 'هنوز دور است؛ بعد از استحکام منطق و معرفت‌شناسی به سراغش برو.',
    parent: 'logic',
  },
  {
    id: 'mind',
    title: 'فلسفه ذهن',
    x: 42,
    y: 62,
    status: 'far',
    description: 'در مه کامل؛ پیش‌نیازهای نزدیک‌تر را اول روشن کن.',
    parent: 'epistemology',
  },
  {
    id: 'political',
    title: 'فلسفه سیاسی',
    x: 68,
    y: 58,
    status: 'near',
    mastery: 28,
    description: 'سایهٔ فهم داری؛ با اخلاق و تاریخ اندیشه روشن‌تر می‌شود.',
    parent: 'ethics',
  },
  {
    id: 'language',
    title: 'فلسفه زبان',
    x: 85,
    y: 72,
    status: 'far',
    description: 'بسیار دور؛ فعلاً فقط یک شبح در افق نقشه است.',
    parent: 'epistemology',
  },
  {
    id: 'science',
    title: 'فلسفه علم',
    x: 30,
    y: 78,
    status: 'far',
    description: 'بعد از منطق و معرفت‌شناسی معنا پیدا می‌کند.',
    parent: 'logic',
  },
]

const edges: { from: string; to: string }[] = [
  { from: 'root', to: 'logic' },
  { from: 'root', to: 'ethics' },
  { from: 'root', to: 'epistemology' },
  { from: 'logic', to: 'metaphysics' },
  { from: 'logic', to: 'science' },
  { from: 'ethics', to: 'political' },
  { from: 'epistemology', to: 'mind' },
  { from: 'epistemology', to: 'language' },
]

function statusMeta(status: NodeStatus) {
  if (status === 'known') {
    return {
      label: 'مسلط / آشکار',
      icon: Eye,
      color: 'text-emerald-300',
      ring: 'ring-emerald-400/50',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-400/40',
      glow: 'shadow-[0_0_30px_rgba(52,211,153,0.35)]',
    }
  }
  if (status === 'near') {
    return {
      label: 'نزدیک / در مه',
      icon: Sparkles,
      color: 'text-teal-200/80',
      ring: 'ring-teal-400/20',
      bg: 'bg-teal-500/10',
      border: 'border-teal-300/20',
      glow: 'shadow-[0_0_24px_rgba(45,212,191,0.15)]',
    }
  }
  return {
    label: 'دور / پنهان',
    icon: Lock,
    color: 'text-slate-400/50',
    ring: 'ring-slate-500/10',
    bg: 'bg-slate-500/5',
    border: 'border-white/5',
    glow: '',
  }
}

export default function KnowledgeMapPage() {
  const [selected, setSelected] = useState<KnowledgeNode | null>(null)

  const getNode = (id: string) => nodes.find((n) => n.id === id)

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#020617] via-[#031a1f] to-[#020617] rtl text-white overflow-hidden">
      {/* Header */}
      <header className="relative z-30 border-b border-white/5 bg-[#020617]/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-teal-400" />
            <div>
              <h1 className="text-sm sm:text-base font-semibold">نقشه دانش</h1>
              <p className="text-[10px] sm:text-xs text-teal-400/70">من کیستم؟ پایگاه دانش</p>
            </div>
          </div>
          <Link
            href="/start"
            className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            بازگشت
          </Link>
        </div>
      </header>

      {/* Legend */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 pt-4">
        <div className="flex flex-wrap gap-2 sm:gap-3 text-[10px] sm:text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200">
            <Eye className="w-3 h-3" /> آشکار و دانسته‌شده
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-300/20 text-teal-100/80">
            <Sparkles className="w-3 h-3" /> نزدیک؛ در هاله ابر
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
            <EyeOff className="w-3 h-3" /> دور و پنهان در مه
          </span>
        </div>
      </div>

      {/* Map canvas */}
      <div className="relative z-10 max-w-6xl mx-auto px-2 sm:px-4 py-4">
        <div className="relative w-full h-[70vh] min-h-[480px] rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_center,_rgba(13,148,136,0.08),_transparent_60%)] overflow-hidden">
          
          {/* Atmospheric fog layers */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 left-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNCkiLz48L3N2Zz4=')]" />
          </div>

          {/* Edges (tree connections) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {edges.map((e) => {
              const a = getNode(e.from)
              const b = getNode(e.to)
              if (!a || !b) return null
              const far = a.status === 'far' || b.status === 'far'
              const near = a.status === 'near' || b.status === 'near'
              return (
                <line
                  key={`\( {e.from}- \){e.to}`}
                  x1={`${a.x}%`}
                  y1={`${a.y}%`}
                  x2={`${b.x}%`}
                  y2={`${b.y}%`}
                  stroke={far ? 'rgba(148,163,184,0.12)' : near ? 'rgba(45,212,191,0.25)' : 'rgba(52,211,153,0.45)'}
                  strokeWidth={far ? 1 : 1.5}
                  strokeDasharray={far ? '4 6' : near ? '6 4' : '0'}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node, i) => {
            const meta = statusMeta(node.status)
            const Icon = meta.icon
            const isSelected = selected?.id === node.id

            return (
              <motion.button
                key={node.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: isSelected ? 1.06 : 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 260, damping: 20 }}
                onClick={() => setSelected(node)}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `\( {node.x}%`, top: ` \){node.y}%` }}
              >
                {/* Cloud / fog for near & far */}
                {(node.status === 'near' || node.status === 'far') && (
                  <span
                    className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl pointer-events-none ${
                      node.status === 'near'
                        ? 'w-28 h-28 bg-teal-400/15'
                        : 'w-32 h-32 bg-slate-400/10'
                    }`}
                  />
                )}

                <div
                  className={`relative flex flex-col items-center gap-1.5 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl border backdrop-blur-md transition-all duration-500 ${meta.bg} ${meta.border} ${meta.glow} ${
                    isSelected ? 'ring-2 ' + meta.ring : ''
                  } ${
                    node.status === 'far'
                      ? 'opacity-35 blur-[2px] grayscale group-hover:opacity-55 group-hover:blur-[1px]'
                      : node.status === 'near'
                      ? 'opacity-80'
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
                          ? 'text-white/75'
                          : 'text-white/40'
                      }`}
                      style={
                        node.status === 'near'
                          ? {
                              textShadow: '0 0 8px rgba(255,255,255,0.15)',
                              WebkitMaskImage:
                                'linear-gradient(90deg, black 55%, transparent 100%)',
                              maskImage:
                                'linear-gradient(90deg, black 55%, transparent 100%)',
                            }
                          : undefined
                      }
                    >
                      {node.title}
                    </span>
                  </div>

                  {typeof node.mastery === 'number' && node.status !== 'far' && (
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
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base sm:text-lg font-semibold">{selected.title}</h2>
                    <span className={`text-[10px] sm:text-xs ${statusMeta(selected.status).color}`}>
                      {statusMeta(selected.status).label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selected.description}</p>
                  {typeof selected.mastery === 'number' && (
                    <p className="mt-2 text-xs text-teal-300/90">تسلط تقریبی: {selected.mastery}٪</p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-white text-sm px-2"
                >
                  بستن
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selected.status === 'known' && (
                  <Link
                    href="/start"
                    className="btn-primary text-xs sm:text-sm px-4 py-2"
                  >
                    تقویت این بخش
                  </Link>
                )}
                {selected.status === 'near' && (
                  <Link
                    href="/start"
                    className="btn-primary text-xs sm:text-sm px-4 py-2"
                  >
                    شروع یادگیری این مفهوم
                  </Link>
                )}
                {selected.status === 'far' && (
                  <span className="text-xs text-gray-400">
                    ابتدا مفاهیم نزدیک‌تر را روشن کن تا این بخش از مه خارج شود.
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
    }
