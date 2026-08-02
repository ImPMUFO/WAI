import { NextRequest, NextResponse } from 'next/server'

type NodeStatus = 'known' | 'near' | 'far'

type MapNode = {
  id: string
  title: string
  status: NodeStatus
  mastery: number
  note: string
}

const domainGraphs: Record<
  string,
  { title: string; nodes: { id: string; title: string; x: number; y: number; parent?: string }[] }
> = {
  philosophy: {
    title: 'فلسفه',
    nodes: [
      { id: 'root', title: 'فلسفه', x: 50, y: 12 },
      { id: 'logic', title: 'منطق', x: 22, y: 34, parent: 'root' },
      { id: 'ethics', title: 'اخلاق', x: 50, y: 38, parent: 'root' },
      { id: 'epistemology', title: 'معرفت‌شناسی', x: 78, y: 34, parent: 'root' },
      { id: 'metaphysics', title: 'متافیزیک', x: 18, y: 60, parent: 'logic' },
      { id: 'political', title: 'فلسفه سیاسی', x: 50, y: 64, parent: 'ethics' },
      { id: 'mind', title: 'فلسفه ذهن', x: 78, y: 60, parent: 'epistemology' },
      { id: 'science', title: 'فلسفه علم', x: 30, y: 82, parent: 'logic' },
      { id: 'language', title: 'فلسفه زبان', x: 70, y: 82, parent: 'epistemology' },
    ],
  },
  programming: {
    title: 'برنامه‌نویسی',
    nodes: [
      { id: 'root', title: 'برنامه‌نویسی', x: 50, y: 12 },
      { id: 'basics', title: 'مبانی', x: 22, y: 34, parent: 'root' },
      { id: 'algorithms', title: 'الگوریتم', x: 50, y: 38, parent: 'root' },
      { id: 'data-structures', title: 'ساختار داده', x: 78, y: 34, parent: 'root' },
      { id: 'oop', title: 'شیءگرایی', x: 22, y: 60, parent: 'basics' },
      { id: 'complexity', title: 'پیچیدگی', x: 50, y: 64, parent: 'algorithms' },
      { id: 'databases', title: 'پایگاه‌داده', x: 78, y: 60, parent: 'data-structures' },
      { id: 'web', title: 'وب', x: 35, y: 82, parent: 'oop' },
      { id: 'systems', title: 'سیستم‌ها', x: 65, y: 82, parent: 'complexity' },
    ],
  },
  history: {
    title: 'تاریخ',
    nodes: [
      { id: 'root', title: 'تاریخ', x: 50, y: 12 },
      { id: 'method', title: 'روش تاریخ‌نگاری', x: 22, y: 34, parent: 'root' },
      { id: 'iran', title: 'تاریخ ایران', x: 50, y: 38, parent: 'root' },
      { id: 'world', title: 'تاریخ جهان', x: 78, y: 34, parent: 'root' },
      { id: 'ancient', title: 'باستان', x: 22, y: 60, parent: 'iran' },
      { id: 'modern', title: 'معاصر', x: 50, y: 64, parent: 'iran' },
      { id: 'ideas', title: 'تاریخ اندیشه', x: 78, y: 60, parent: 'world' },
      { id: 'sources', title: 'منابع و نقد', x: 35, y: 82, parent: 'method' },
      { id: 'civilizations', title: 'تمدن‌ها', x: 65, y: 82, parent: 'world' },
    ],
  },
  psychology: {
    title: 'روان‌شناسی',
    nodes: [
      { id: 'root', title: 'روان‌شناسی', x: 50, y: 12 },
      { id: 'cognitive', title: 'شناختی', x: 22, y: 34, parent: 'root' },
      { id: 'behavioral', title: 'رفتاری', x: 50, y: 38, parent: 'root' },
      { id: 'personality', title: 'شخصیت', x: 78, y: 34, parent: 'root' },
      { id: 'memory', title: 'حافظه', x: 22, y: 60, parent: 'cognitive' },
      { id: 'learning', title: 'یادگیری', x: 50, y: 64, parent: 'behavioral' },
      { id: 'emotion', title: 'هیجان', x: 78, y: 60, parent: 'personality' },
      { id: 'bias', title: 'سوگیری‌ها', x: 35, y: 82, parent: 'cognitive' },
      { id: 'self', title: 'خودآگاهی', x: 65, y: 82, parent: 'emotion' },
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

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'messages الزامی است' }, { status: 400 })
    }

    const graph = domainGraphs[domain] || domainGraphs.philosophy
    const catalog = graph.nodes.map((n) => `- ${n.id}: ${n.title}`).join('\n')

    const transcript = messages
      .slice(-20)
      .map((m) => `${m.role === 'user' ? userName : 'ارزیاب'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `تو تحلیل‌گر نقشه دانش هستی برای پلتفرم «من کیستم؟».
فقط JSON معتبر برگردان. بدون متن اضافه و بدون markdown.

برای هر مفهوم یکی از وضعیت‌ها:
- known: شواهد کافی که کاربر می‌فهمد (mastery 60-100)
- near: آشنایی ناقص یا در حال یادگیری (mastery 20-59)
- far: شواهدی نیست یا خیلی ضعیف (mastery 0-19)

قوانین:
1. محافظه‌کار باش؛ بدون شواهد، far بگذار.
2. اگر کاربر سطحی حرف زده، known نده.
3. note کوتاه و فارسی باشد.
4. همه idهای کاتالوگ باید در خروجی باشند.

کاتالوگ مفاهیم حوزه ${graph.title}:
${catalog}`

    const userPrompt = `گفت‌وگو:
${transcript}

خروجی دقیقاً این قالب:
{
  "summary": "خلاصه کوتاه فارسی از وضعیت دانش کاربر",
  "nodes": [
    { "id": "logic", "title": "منطق", "status": "known", "mastery": 75, "note": "..." }
  ]
}`

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        max_tokens: 2000,
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
      return NextResponse.json({ success: false, error: 'خروجی JSON نبود', raw: content }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      summary?: string
      nodes?: MapNode[]
    }

    // ادغام با مختصات ثابت گراف
    const byId = new Map((parsed.nodes || []).map((n) => [n.id, n]))
    const merged = graph.nodes.map((g) => {
      const a = byId.get(g.id)
      const status = (a?.status as NodeStatus) || 'far'
      const mastery =
        typeof a?.mastery === 'number'
          ? Math.max(0, Math.min(100, a.mastery))
          : status === 'known'
            ? 70
            : status === 'near'
              ? 35
              : 5

      return {
        id: g.id,
        title: g.title,
        x: g.x,
        y: g.y,
        parent: g.parent,
        status,
        mastery,
        note: a?.note || (status === 'far' ? 'هنوز شواهدی ثبت نشده است.' : ''),
      }
    })

    const result = {
      domain,
      domainTitle: graph.title,
      summary: parsed.summary || 'تحلیل انجام شد.',
      updatedAt: new Date().toISOString(),
      nodes: merged,
    }

    return NextResponse.json({ success: true, map: result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: 'خطای داخلی' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'analyze' })
      }
