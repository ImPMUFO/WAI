/**
 * Knowledge Graph هسته — روابط، پیش‌نیاز، منابع، قدم بعدی
 */

export type NodeStatus = 'known' | 'near' | 'far' | 'misconception'

export type ScoreBreakdown = {
  definition: number // 0-100 آشنایی با تعریف
  depth: number // درک عمیق
  comparison: number // مقایسه
  reasoning: number // استدلال
  note?: string
}

export type KnowledgeNode = {
  id: string
  title: string
  status: NodeStatus
  mastery: number
  note?: string
  parent?: string
  links?: string[] // ارتباط با گره‌های دیگر
  prereqs?: string[]
  breakdown?: ScoreBreakdown
  misconception?: string | null
  resources?: { type: string; title: string; url?: string }[]
  updatedAt?: number
}

export type KnowledgeMap = {
  domain?: string
  domainTitle?: string
  updatedAt?: number
  nodes: KnowledgeNode[]
}

/** گراف پایه حوزه‌ها و پیش‌نیازها */
export const BASE_GRAPH: {
  id: string
  title: string
  parent?: string
  prereqs?: string[]
  links?: string[]
  resources?: { type: string; title: string }[]
}[] = [
  {
    id: 'mind',
    title: 'ذهن',
    links: ['philosophy', 'science', 'history', 'general'],
  },
  {
    id: 'philosophy',
    title: 'فلسفه',
    prereqs: ['logic'],
    links: ['religion', 'psychology'],
    resources: [
      { type: 'book', title: 'جمهوری — افلاطون' },
      { type: 'path', title: 'منطق → اخلاق → متافیزیک' },
    ],
  },
  {
    id: 'logic',
    title: 'منطق',
    prereqs: [],
    links: ['philosophy', 'math'],
    resources: [{ type: 'book', title: 'منطق کاربردی' }],
  },
  {
    id: 'history',
    title: 'تاریخ',
    links: ['philosophy', 'religion'],
    resources: [{ type: 'book', title: 'تاریخ مختصر جهان' }],
  },
  {
    id: 'science',
    title: 'علوم',
    prereqs: ['math'],
    links: ['tech'],
    resources: [{ type: 'path', title: 'فیزیک پایه → شیمی → زیست' }],
  },
  {
    id: 'math',
    title: 'ریاضی',
    links: ['science', 'logic'],
    resources: [{ type: 'practice', title: 'تمرین استدلال کمی' }],
  },
  {
    id: 'language',
    title: 'زبان',
    links: ['general'],
    resources: [{ type: 'practice', title: 'واژه‌آموزی روزانه' }],
  },
  {
    id: 'religion',
    title: 'دین و اخلاق',
    links: ['philosophy'],
    resources: [{ type: 'book', title: 'آشنایی با فلسفه اخلاق' }],
  },
  {
    id: 'psychology',
    title: 'روان‌شناسی',
    links: ['philosophy', 'science'],
    resources: [{ type: 'book', title: 'روان‌شناسی برای همه' }],
  },
  {
    id: 'economics',
    title: 'اقتصاد',
    links: ['history', 'math'],
    resources: [{ type: 'book', title: 'اقتصاد به زبان ساده' }],
  },
  {
    id: 'tech',
    title: 'فناوری',
    prereqs: ['science'],
    links: ['math'],
    resources: [{ type: 'path', title: 'مبانی رایانه → الگوریتم' }],
  },
  {
    id: 'general',
    title: 'دانش عمومی',
    links: ['history', 'science', 'language'],
  },
  {
    id: 'recall',
    title: 'یادآوری',
    parent: 'mind',
    links: ['focus'],
  },
  {
    id: 'focus',
    title: 'تمرکز',
    parent: 'mind',
  },
]

export function graphMeta(id: string) {
  return BASE_GRAPH.find((g) => g.id === id)
}

export function enrichNode(n: KnowledgeNode): KnowledgeNode {
  const meta = graphMeta(n.id)
  if (!meta) return n
  return {
    ...n,
    title: n.title || meta.title,
    prereqs: n.prereqs?.length ? n.prereqs : meta.prereqs || [],
    links: n.links?.length ? n.links : meta.links || [],
    resources: n.resources?.length ? n.resources : meta.resources || [],
  }
}

export function suggestNextStep(map: KnowledgeMap | null): {
  nodeId: string
  title: string
  reason: string
  action: 'chat' | 'quiz' | 'review'
} | null {
  if (!map?.nodes?.length) {
    return {
      nodeId: 'general',
      title: 'دانش عمومی',
      reason: 'نقشه هنوز خالی است — با یک گفتگوی کوتاه اولین نقطه روشن می‌شود.',
      action: 'chat',
    }
  }
  const nodes = map.nodes.map(enrichNode).filter((n) => n.id !== 'mind')
  // سوءبرداشت اولویت اول
  const mis = nodes.find((n) => n.status === 'misconception' || n.misconception)
  if (mis) {
    return {
      nodeId: mis.id,
      title: mis.title,
      reason: `احتمال سوءبرداشت در «${mis.title}» — بهتر است با گفتگو یا آزمون سبک اصلاح شود.`,
      action: 'chat',
    }
  }
  // پیش‌نیاز ضعیف
  for (const n of nodes.filter((x) => (x.mastery || 0) >= 40)) {
    for (const p of n.prereqs || []) {
      const pr = nodes.find((x) => x.id === p) || graphMeta(p)
      const prNode = nodes.find((x) => x.id === p)
      const m = prNode?.mastery ?? 0
      if (m < 30) {
        return {
          nodeId: p,
          title: prNode?.title || graphMeta(p)?.title || p,
          reason: `برای محکم‌تر شدن «${n.title}»، پیش‌نیاز «${prNode?.title || p}» هنوز ضعیف است.`,
          action: 'quiz',
        }
      }
    }
  }
  // نزدیک‌ترین برای رشد
  const near = [...nodes]
    .filter((n) => n.status === 'near' || ((n.mastery || 0) >= 15 && (n.mastery || 0) < 55))
    .sort((a, b) => (b.mastery || 0) - (a.mastery || 0))
  if (near[0]) {
    return {
      nodeId: near[0].id,
      title: near[0].title,
      reason: `«${near[0].title}» نزدیک کشف کامل است — یک دور گفتگو یا کوئیز آن را بالا می‌برد.`,
      action: 'chat',
    }
  }
  const far = nodes.filter((n) => n.status === 'far' || (n.mastery || 0) < 15)
  if (far[0]) {
    return {
      nodeId: far[0].id,
      title: far[0].title,
      reason: `ناحیه «${far[0].title}» هنوز در مه است — شروع سبک پیشنهاد می‌شود.`,
      action: 'chat',
    }
  }
  const weakest = [...nodes].sort((a, b) => (a.mastery || 0) - (b.mastery || 0))[0]
  if (weakest) {
    return {
      nodeId: weakest.id,
      title: weakest.title,
      reason: `کمترین تسلط روی «${weakest.title}» است.`,
      action: 'review',
    }
  }
  return null
}

export function defaultBreakdown(mastery: number): ScoreBreakdown {
  const base = Math.max(0, Math.min(100, mastery))
  return {
    definition: Math.round(base * 0.9 + 5),
    depth: Math.round(base * 0.75),
    comparison: Math.round(base * 0.65),
    reasoning: Math.round(base * 0.7),
    note: base >= 60 ? 'تعریف نسبتاً خوب؛ استدلال قابل رشد است.' : 'هنوز در لایه آشنایی است.',
  }
}

const JOURNEY_KEY = 'wai_knowledge_journey'

export type JourneyEvent = {
  ts: number
  type: 'chat' | 'quiz' | 'map' | 'level' | 'misconception'
  label: string
  nodeId?: string
  delta?: number
}

export function pushJourney(ev: Omit<JourneyEvent, 'ts'>) {
  try {
    const raw = localStorage.getItem(JOURNEY_KEY)
    const list: JourneyEvent[] = raw ? JSON.parse(raw) : []
    list.unshift({ ...ev, ts: Date.now() })
    localStorage.setItem(JOURNEY_KEY, JSON.stringify(list.slice(0, 100)))
  } catch {
    /* ignore */
  }
}

export function loadJourney(): JourneyEvent[] {
  try {
    return JSON.parse(localStorage.getItem(JOURNEY_KEY) || '[]')
  } catch {
    return []
  }
}
