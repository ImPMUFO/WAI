import { pushJourney } from '@/lib/knowledge-graph'
/** به‌روزرسانی سبک نقشه ذهنی از فعالیت‌های سایت (غیر از گفتگوی جهانی) */

export const MAP_KEY = 'wai_map_unified'

export type NodeStatus = 'known' | 'near' | 'far'

export type MindNode = {
  id: string
  title: string
  status: NodeStatus
  mastery: number
  note?: string
  parent?: string
}

export type MindMap = {
  domain?: string
  updatedAt?: number
  nodes: MindNode[]
}

function statusFromMastery(m: number): NodeStatus {
  if (m >= 55) return 'known'
  if (m >= 22) return 'near'
  return 'far'
}

export function loadMindMap(): MindMap | null {
  try {
    const raw = localStorage.getItem(MAP_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d || !Array.isArray(d.nodes)) return null
    return d as MindMap
  } catch {
    return null
  }
}

export function saveMindMap(map: MindMap) {
  try {
    const next = { ...map, updatedAt: Date.now() }
    localStorage.setItem(MAP_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('waima-map-updated'))
  } catch {
    /* ignore */
  }
}

/** تقویت گره بر اساس فعالیت (بازی، تم، آواتار، گفتگوی AI) */
export function bumpMindNode(
  id: string,
  title: string,
  amount: number,
  note?: string,
  parent = 'mind'
): MindMap {
  let map = loadMindMap()
  if (!map || !map.nodes?.length) {
    map = {
      domain: 'unified',
      nodes: [{ id: 'mind', title: 'ذهن', status: 'known', mastery: 40, note: 'مرکز آگاهی' }],
    }
  }
  const nodes = [...map.nodes]
  let idx = nodes.findIndex((n) => n.id === id)
  if (idx < 0) {
    nodes.push({
      id,
      title,
      status: 'near',
      mastery: Math.max(8, Math.min(100, amount)),
      note: note || '',
      parent,
    })
  } else {
    const prev = nodes[idx]
    const mastery = Math.max(0, Math.min(100, (prev.mastery || 0) + amount))
    nodes[idx] = {
      ...prev,
      title: prev.title || title,
      mastery,
      status: statusFromMastery(mastery),
      note: note || prev.note || '',
      parent: prev.parent || parent,
    }
  }
  // مرکز ذهن کمی رشد کند
  const mindIdx = nodes.findIndex((n) => n.id === 'mind')
  if (mindIdx >= 0) {
    const m = Math.min(100, (nodes[mindIdx].mastery || 40) + Math.max(1, Math.round(amount * 0.25)))
    nodes[mindIdx] = { ...nodes[mindIdx], mastery: m, status: statusFromMastery(m) }
  }
  const next = { ...map, nodes, domain: map.domain || 'unified' }
  saveMindMap(next)
  return next
}

export function bumpFromQuiz(domain: string, correct: boolean) {
  const id = (domain || 'general').toLowerCase().replace(/\s+/g, '_').slice(0, 32) || 'general'
  const titles: Record<string, string> = {
    philosophy: 'فلسفه',
    history: 'تاریخ',
    science: 'علوم',
    math: 'ریاضی',
    language: 'زبان',
    religion: 'دین',
    psychology: 'روان‌شناسی',
    economics: 'اقتصاد',
    tech: 'فناوری',
    general: 'دانش عمومی',
  }
  // پاسخ درست رشد بیشتر؛ غلط هم مسیر نزدیک را کمی روشن می‌کند
  const amount = correct ? 8 : 3
  const note = correct ? 'از بازی/کوئیز تقویت شد' : 'تمرین بازی — هنوز جا برای رشد'
  bumpMindNode(id, titles[id] || domain || 'دانش', amount, note)
  try {
    pushJourney({
      type: 'quiz',
      label: correct ? `پاسخ درست در ${titles[id] || domain}` : `تمرین در ${titles[id] || domain}`,
      nodeId: id,
      delta: amount,
    })
  } catch { /* */ }
  // مهارت‌های عرضی
  bumpMindNode(
    correct ? 'recall' : 'focus',
    correct ? 'یادآوری' : 'تمرکز',
    correct ? 3 : 2,
    correct ? 'پاسخ درست در بازی' : 'تلاش در بازی',
    'mind'
  )
  if (correct) {
    bumpMindNode('logic', 'منطق و استدلال', 2, 'از چالش بازی', 'mind')
  }
}

export function bumpFromTheme(themeId: string) {
  bumpMindNode('awareness', 'آگاهی و توجه', 3, `تعامل با پوسته ${themeId}`, 'mind')
}

export function bumpFromAvatar() {
  bumpMindNode('identity', 'هویت', 4, 'انتخاب آواتار', 'mind')
}
