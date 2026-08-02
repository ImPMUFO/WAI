import { NextRequest, NextResponse } from 'next/server'

type NodeStatus = 'known' | 'near' | 'far'

const domainGraphs: Record<
  string,
  { title: string; nodes: { id: string; title: string; parent?: string }[] }
> = {
  philosophy: {
    title: 'فلسفه',
    nodes: [
      { id: 'root', title: 'فلسفه' },
      { id: 'logic', title: 'منطق', parent: 'root' },
      { id: 'ethics', title: 'اخلاق', parent: 'root' },
      { id: 'epistemology', title: 'معرفت‌شناسی', parent: 'root' },
      { id: 'metaphysics', title: 'متافیزیک', parent: 'logic' },
      { id: 'political', title: 'فلسفه سیاسی', parent: 'ethics' },
      { id: 'mind', title: 'فلسفه ذهن', parent: 'epistemology' },
      { id: 'science', title: 'فلسفه علم', parent: 'logic' },
      { id: 'language', title: 'فلسفه زبان', parent: 'epistemology' },
    ],
  },
  programming: {
    title: 'برنامه‌نویسی',
    nodes: [
      { id: 'root', title: 'برنامه‌نویسی' },
      { id: 'basics', title: 'مبانی', parent: 'root' },
      { id: 'algorithms', title: 'الگوریتم', parent: 'root' },
      { id: 'data-structures', title: 'ساختار داده', parent: 'root' },
      { id: 'oop', title: 'شیءگرایی', parent: 'basics' },
      { id: 'complexity', title: 'پیچیدگی', parent: 'algorithms' },
      { id: 'databases', title: 'پایگاه‌داده', parent: 'data-structures' },
      { id: 'web', title: 'وب', parent: 'oop' },
      { id: 'systems', title: 'سیستم‌ها', parent: 'complexity' },
    ],
  },
  history: {
    title: 'تاریخ',
    nodes: [
      { id: 'root', title: 'تاریخ' },
      { id: 'method', title: 'روش تاریخ‌نگاری', parent: 'root' },
      { id: 'iran', title: 'تاریخ ایران', parent: 'root' },
      { id: 'world', title: 'تاریخ جهان', parent: 'root' },
      { id: 'ancient', title: 'باستان', parent: 'iran' },
      { id: 'modern', title: 'معاصر', parent: 'iran' },
      { id: 'ideas', title: 'تاریخ اندیشه', parent: 'world' },
      { id: 'sources', title: 'منابع و نقد', parent: 'method' },
      { id: 'civilizations', title: 'تمدن‌ها', parent: 'world' },
    ],
  },
  psychology: {
    title: 'روان‌شناسی',
    nodes: [
      { id: 'root', title: 'روان‌شناسی' },
      { id: 'cognitive', title: 'شناختی', parent: 'root' },
      { id: 'behavioral', title: 'رفتاری', parent: 'root' },
      { id: 'personality', title: 'شخصیت', parent: 'root' },
      { id: 'memory', title: 'حافظه', parent: 'cognitive' },
      { id: 'learning', title: 'یادگیری', parent: 'behavioral' },
      { id: 'emotion', title: 'هیجان', parent: 'personality' },
      { id: 'bias', title: 'سوگیری‌ها', parent: 'cognitive' },
      { id: 'self', title: 'خودآگاهی', parent: 'emotion' },
    ],
  },
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.gapgpt.app/v1').replace(/\/$/, '')
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY تنظیم نشده' }, { status: 500 })
    }

    const body = await req.json()
    const domain = (body?.domain as string) || 'philosophy'
    const messages = body?.messages as { role: string; content: string }[]
    const userName = (body?.userName as string) || 'کاربر'

    if (!messages?.length) {
      return NextResponse.json({ success: false, error: 'messages الزامی است' }, { status: 400 })
    }

    const graph = domainGraphs[domain] || domainGraphs.philosophy
    const catalog = graph.nodes.map((n) => `- ${n.id}: ${n.title}`).join('\n')
    const transcript = messages
      .slice(-24)
      .map((m) => `${m.role === 'user' ? userName : 'ارزیاب'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `تو تحلیل‌گر نقشه دانش «من کیستم؟» هستی.
فقط JSON خالص برگردان.

وضعیت‌ها:
- known: فهم نسبتاً روشن (mastery 55-100)
- near: آشنایی ناقص / در حال شکل‌گیری (mastery 20-54)
- far: دور و کم‌شواهد (mastery 0-19)

قوانین مهم:
1. اگر گفت‌وگو شروع شده، هرگز همه را far نگذار.
2. حداقل root را near یا known بده.
3. اگر کاربر حتی یک جمله مرتبط گفته، ۱ تا ۳ مفهوم نزدیک را near کن.
4. بدون اغراق؛ known فقط با شواهد نسبی.
5. note کوتاه فارسی.

کاتالوگ ${graph.title}:
${catalog}`

    const userPrompt = `گفت‌وگو:
${transcript}

خروجی:
{"summary":"...","nodes":[{"id":"root","title":"...","status":"near","mastery":40,"note":"..."}]}`

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.25,
        max_tokens: 1800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    const text = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: 'خطا از مدل', details: text }, { status: 502 })
    }

    const data = JSON.parse(text)
    const content = data?.choices?.[0]?.message?.content || ''
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: 'JSON نبود' }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string
      nodes?: { id: string; title?: string; status?: NodeStatus; mastery?: number; note?: string }[]
    }

    const byId = new Map((parsed.nodes || []).map((n) => [n.id, n]))

    let merged = graph.nodes.map((g) => {
      const a = byId.get(g.id)
      let status: NodeStatus = (a?.status as NodeStatus) || 'far'
      let mastery =
        typeof a?.mastery === 'number'
          ? Math.max(0, Math.min(100, a.mastery))
          : status === 'known'
            ? 70
            : status === 'near'
              ? 35
              : 8

      return {
        id: g.id,
        title: g.title,
        parent: g.parent,
        status,
        mastery,
        note: a?.note || '',
      }
    })

    // تضمین: اگر گفت‌وگو هست، حداقل چیزی در دایره معلومات باشد
    const hasSignal = messages.some((m) => m.role === 'user' && m.content.trim().length > 0)
    if (hasSignal) {
      const knownOrNear = merged.filter((n) => n.status !== 'far')
      if (knownOrNear.length === 0) {
        merged = merged.map((n) => {
          if (n.id === 'root') return { ...n, status: 'near' as const, mastery: 35, note: n.note || 'شروع مسیر دانش در این حوزه.' }
          if (!n.parent || n.parent === 'root') return { ...n, status: 'near' as const, mastery: 28, note: n.note || 'نشانه‌های اولیه آشنایی.' }
          return n
        })
      }
    }

    return NextResponse.json({
      success: true,
      map: {
        domain,
        domainTitle: graph.title,
        summary: parsed.summary || 'نقشه بر اساس گفت‌وگو به‌روز شد.',
        updatedAt: new Date().toISOString(),
        nodes: merged,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'خطای داخلی' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'analyzer' })
                              }
