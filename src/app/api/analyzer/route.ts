import { NextRequest, NextResponse } from 'next/server'
import { getAIConfig, aiHeaders } from '@/lib/ai'

type NodeStatus = 'known' | 'near' | 'far'

type Msg = { role: string; content: string }

const BASE_GRAPH: { id: string; title: string; parent?: string; domain?: string }[] = [
  { id: 'mind', title: 'ذهن' },
  { id: 'philosophy', title: 'فلسفه', parent: 'mind', domain: 'philosophy' },
  { id: 'logic', title: 'منطق', parent: 'philosophy', domain: 'philosophy' },
  { id: 'ethics', title: 'اخلاق', parent: 'philosophy', domain: 'ethics' },
  { id: 'epistemology', title: 'معرفت‌شناسی', parent: 'philosophy', domain: 'philosophy' },
  { id: 'history', title: 'تاریخ', parent: 'mind', domain: 'history' },
  { id: 'science', title: 'علوم', parent: 'mind', domain: 'science' },
  { id: 'physics', title: 'فیزیک', parent: 'science', domain: 'physics' },
  { id: 'chemistry', title: 'شیمی', parent: 'science', domain: 'chemistry' },
  { id: 'biology', title: 'زیست', parent: 'science', domain: 'biology' },
  { id: 'math', title: 'ریاضی', parent: 'mind', domain: 'math' },
  { id: 'programming', title: 'برنامه‌نویسی', parent: 'mind', domain: 'programming' },
  { id: 'psychology', title: 'روان‌شناسی', parent: 'mind', domain: 'psychology' },
  { id: 'religion', title: 'دین', parent: 'mind', domain: 'religion' },
  { id: 'language', title: 'زبان', parent: 'mind', domain: 'language' },
  { id: 'economics', title: 'اقتصاد', parent: 'mind', domain: 'economics' },
]

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

/** رشد آهسته و منطقی mastery */
function smoothMastery(prev: number, target: number): number {
  const p = clamp(prev, 0, 100)
  const t = clamp(target, 0, 100)
  if (t > p) return clamp(p + Math.min(12, Math.max(3, Math.round((t - p) * 0.35))), 0, 100)
  if (t < p) return clamp(p - Math.min(6, Math.max(1, Math.round((p - t) * 0.25))), 0, 100)
  return p
}

function statusFromMastery(m: number): NodeStatus {
  if (m >= 55) return 'known'
  if (m >= 22) return 'near'
  return 'far'
}

function extractKeywords(messages: Msg[]): string {
  return messages
    .map((m) => String(m.content || ''))
    .join('\n')
    .slice(0, 6000)
}

function heuristicBoost(domain: string, text: string): Record<string, number> {
  const t = text.toLowerCase()
  const boost: Record<string, number> = { mind: 8 }
  const rules: [string, string[]][] = [
    ['philosophy', ['فلسف', 'وجود', 'معرفت', 'منطق', 'philosophy', 'logic']],
    ['logic', ['منطق', 'استدلال', 'قیاس', 'logic']],
    ['ethics', ['اخلاق', 'درست', 'غلط', 'ethics', 'moral']],
    ['epistemology', ['معرفت', 'دانستن', 'حقیقت', 'knowledge']],
    ['history', ['تاریخ', 'جنگ', 'تمدن', 'history']],
    ['science', ['علم', 'science']],
    ['physics', ['فیزیک', 'نیرو', 'انرژی', 'physics']],
    ['chemistry', ['شیمی', 'مولکول', 'chemistry']],
    ['biology', ['زیست', 'ژن', 'سلول', 'biology']],
    ['math', ['ریاض', 'معادله', 'math', 'عدد']],
    ['programming', ['برنامه', 'کد', 'python', 'javascript', 'algorithm']],
    ['psychology', ['روان', 'ذهن', 'رفتار', 'psychology']],
    ['religion', ['دین', 'قرآن', 'خدا', 'ایمان', 'religion']],
    ['language', ['زبان', 'دستور', 'vocabulary', 'grammar']],
    ['economics', ['اقتصاد', 'بازار', 'پول', 'economics']],
  ]
  for (const [id, keys] of rules) {
    if (keys.some((k) => t.includes(k))) boost[id] = (boost[id] || 0) + 14
  }
  if (domain && domain !== 'general') {
    boost[domain] = (boost[domain] || 0) + 10
  }
  // هر پیام کاربر کمی رشد عمومی
  const userMsgs = (text.match(/\n/g) || []).length
  boost.mind = (boost.mind || 0) + Math.min(20, userMsgs)
  return boost
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const domain = String(body?.domain || 'general')
    const messages: Msg[] = Array.isArray(body?.messages) ? body.messages : []
    const previousMap = body?.previousMap

    type PrevNode = { id: string; status?: NodeStatus; mastery?: number; note?: string; title?: string; parent?: string }
    let previous: PrevNode[] = []
    if (previousMap?.nodes && Array.isArray(previousMap.nodes)) {
      previous = previousMap.nodes
    }

    const text = extractKeywords(messages)
    const boosts = heuristicBoost(domain, text)

    // اختیاری: اگر API بود تحلیل ظریف‌تر؛ ولی برای سرعت همیشه پایه را نگه می‌داریم
    let aiNodes: { id: string; status?: NodeStatus; mastery?: number; note?: string }[] = []
    const cfg = getAIConfig('analyzer')
    const { baseUrl, model } = cfg
    const keyPool = cfg.keys.length ? cfg.keys : cfg.apiKey ? [cfg.apiKey] : []

    if (keyPool.length && messages.length >= 2) {
      const system = `You update a knowledge mind-map. Reply JSON only:
{"summary":"...","nodes":[{"id":"philosophy","status":"near","mastery":30,"note":"..."}]}
Rules: mastery 0-100, small changes only (+/-15 max from typical). ids from: ${BASE_GRAPH.map((g) => g.id).join(', ')}. status known|near|far.`
      for (const tryKey of keyPool) {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 8000)
          const resp = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: aiHeaders(tryKey),
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: system },
                {
                  role: 'user',
                  content: `domain=${domain}
chat:
${text.slice(0, 3500)}
previous:
${JSON.stringify(previous.slice(0, 20))}`,
                },
              ],
              temperature: 0.3,
              max_tokens: 900,
            }),
            signal: controller.signal,
          })
          clearTimeout(timer)
          if (!resp.ok) continue
          const raw = await resp.text()
          const content = JSON.parse(raw)?.choices?.[0]?.message?.content || ''
          const m = content.match(/\{[\s\S]*\}/)
          if (m) {
            const parsed = JSON.parse(m[0])
            if (Array.isArray(parsed.nodes)) {
              aiNodes = parsed.nodes
              break
            }
          }
        } catch {
          continue
        }
      }
    }

    const prevById = new Map(previous.map((p) => [p.id, p]))
    const aiById = new Map(aiNodes.map((n) => [n.id, n]))

    const merged = BASE_GRAPH.map((g) => {
      const p = prevById.get(g.id)
      const a = aiById.get(g.id)
      const prevM = typeof p?.mastery === 'number' ? p.mastery : g.id === 'mind' ? 25 : 5
      let target = prevM + (boosts[g.id] || 0)
      if (typeof a?.mastery === 'number') {
        // AI فقط کمی اثر بگذارد
        target = Math.round(prevM * 0.7 + a.mastery * 0.3 + (boosts[g.id] || 0) * 0.5)
      }
      // اولین پیام: حداقل کمی رشد
      if (messages.some((m) => m.role === 'user') && g.id === 'mind' && prevM < 15) {
        target = Math.max(target, 18)
      }
      const mastery = smoothMastery(prevM, target)
      const status = statusFromMastery(mastery)
      return {
        id: g.id,
        title: p?.title || g.title,
        parent: g.parent,
        status,
        mastery,
        note: a?.note || p?.note || '',
      }
    })

    // نودهای قبلی خارج از BASE را هم نگه دار
    for (const p of previous) {
      if (!merged.some((n) => n.id === p.id)) {
        merged.push({
          id: p.id,
          title: p.title || p.id,
          parent: p.parent || 'mind',
          status: (p.status as NodeStatus) || statusFromMastery(p.mastery || 0),
          mastery: typeof p.mastery === 'number' ? p.mastery : 10,
          note: p.note || '',
        })
      }
    }

    return NextResponse.json({
      success: true,
      map: {
        domain: 'unified',
        domainTitle: 'نقشه کامل ذهن',
        summary: 'نقشه با گفتگو به‌روز شد.',
        updatedAt: new Date().toISOString(),
        nodes: merged,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'خطای داخلی' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'analyzer-smooth' })
}