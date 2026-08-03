import { NextRequest, NextResponse } from 'next/server'

type NodeStatus = 'known' | 'near' | 'far'

/** گراف یکپارچه ذهن — همه حوزه‌ها زیر یک ریشه */
const UNIFIED_GRAPH: { id: string; title: string; parent?: string }[] = [
  { id: 'mind', title: 'ذهن من' },

  { id: 'philosophy', title: 'فلسفه', parent: 'mind' },
  { id: 'logic', title: 'منطق', parent: 'philosophy' },
  { id: 'metaphysics', title: 'متافیزیک', parent: 'philosophy' },
  { id: 'epistemology', title: 'معرفت‌شناسی', parent: 'philosophy' },

  { id: 'ethics', title: 'اخلاق', parent: 'mind' },
  { id: 'applied-ethics', title: 'اخلاق کاربردی', parent: 'ethics' },

  { id: 'religion', title: 'دین و الهیات', parent: 'mind' },
  { id: 'theology', title: 'کلام', parent: 'religion' },
  { id: 'comparative-religion', title: 'ادیان تطبیقی', parent: 'religion' },

  { id: 'programming', title: 'برنامه‌نویسی', parent: 'mind' },
  { id: 'algorithms', title: 'الگوریتم', parent: 'programming' },
  { id: 'web', title: 'وب', parent: 'programming' },

  { id: 'math', title: 'ریاضی', parent: 'mind' },
  { id: 'algebra', title: 'جبر', parent: 'math' },
  { id: 'calculus', title: 'حسابان', parent: 'math' },

  { id: 'physics', title: 'فیزیک', parent: 'mind' },
  { id: 'mechanics', title: 'مکانیک', parent: 'physics' },
  { id: 'quantum', title: 'کوانتوم', parent: 'physics' },

  { id: 'chemistry', title: 'شیمی', parent: 'mind' },
  { id: 'organic-chem', title: 'شیمی آلی', parent: 'chemistry' },

  { id: 'biology', title: 'زیست‌شناسی', parent: 'mind' },
  { id: 'genetics', title: 'ژنتیک', parent: 'biology' },

  { id: 'history', title: 'تاریخ', parent: 'mind' },
  { id: 'iran-history', title: 'تاریخ ایران', parent: 'history' },
  { id: 'world-history', title: 'تاریخ جهان', parent: 'history' },

  { id: 'psychology', title: 'روان‌شناسی', parent: 'mind' },
  { id: 'cognitive', title: 'شناختی', parent: 'psychology' },
  { id: 'personality', title: 'شخصیت', parent: 'psychology' },

  { id: 'literature', title: 'ادبیات', parent: 'mind' },
  { id: 'economics', title: 'اقتصاد', parent: 'mind' },
]

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.gapgpt.app/v1').replace(/\/$/, '')
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY تنظیم نشده' }, { status: 500 })
    }

    const body = await req.json()
    const messages = body?.messages as { role: string; content: string }[]
    const userName = (body?.userName as string) || 'کاربر'
    const domain = (body?.domain as string) || 'general'

    if (!messages?.length) {
      return NextResponse.json({ success: false, error: 'messages الزامی است' }, { status: 400 })
    }

    // نقشه قبلی را ادغام کن تا دانش حوزه‌های دیگر پاک نشود
    let previous: { id: string; status?: NodeStatus; mastery?: number; note?: string }[] = []
    try {
      if (body?.previousMap?.nodes) previous = body.previousMap.nodes
    } catch {
      previous = []
    }
    const prevById = new Map(previous.map((n) => [n.id, n]))

    const catalog = UNIFIED_GRAPH.map((n) => `- ${n.id}: ${n.title}`).join('\n')
    const transcript = messages
      .slice(-16)
      .map((m) => `${m.role === 'user' ? userName : 'ارزیاب'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `تحلیل‌گر نقشه یکپارچه ذهن هستی. فقط JSON خالص برگردان.
وضعیت: known (55-100) | near (20-54) | far (0-19)
قوانین:
1. فقط مفاهیمی را تغییر بده که در گفت‌وگو شواهد دارند.
2. بقیه را دست نزن یا far بگذار.
3. اگر گفت‌وگو شروع شده، mind را حداقل near کن.
4. حوزه فعلی گفت‌وگو: ${domain}
5. note خیلی کوتاه و فارسی.

کاتالوگ:
${catalog}`

    const userPrompt = `گفت‌وگو:
${transcript}

خروجی:
{"summary":"...","nodes":[{"id":"mind","title":"ذهن من","status":"near","mastery":40,"note":"..."}]}`

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 1400,
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
      nodes?: { id: string; status?: NodeStatus; mastery?: number; note?: string }[]
    }
    const byId = new Map((parsed.nodes || []).map((n) => [n.id, n]))

    const merged = UNIFIED_GRAPH.map((g) => {
      const a = byId.get(g.id)
      const p = prevById.get(g.id)

      // اولویت با تحلیل جدید اگر status معتبر دارد، وگرنه قبلی
      let status: NodeStatus = (a?.status as NodeStatus) || (p?.status as NodeStatus) || 'far'
      let mastery =
        typeof a?.mastery === 'number'
          ? a.mastery
          : typeof p?.mastery === 'number'
            ? p.mastery
            : status === 'known'
              ? 70
              : status === 'near'
                ? 35
                : 5

      mastery = Math.max(0, Math.min(100, mastery))
      // اگر قبلا known بوده و تحلیل جدید far بی‌دلیل داد، previous را حفظ کن
      if (p?.status === 'known' && status === 'far' && !a) {
        status = 'known'
        mastery = p.mastery ?? 70
      } else if (p?.status === 'near' && status === 'far' && !a) {
        status = 'near'
        mastery = p.mastery ?? 35
      }

      return {
        id: g.id,
        title: g.title,
        parent: g.parent,
        status,
        mastery,
        note: a?.note || p?.note || '',
      }
    })

    const hasUser = messages.some((m) => m.role === 'user' && String(m.content || '').trim())
    if (hasUser) {
      const anyOpen = merged.some((n) => n.status !== 'far')
      if (!anyOpen) {
        const mind = merged.find((n) => n.id === 'mind')
        if (mind) {
          mind.status = 'near'
          mind.mastery = 30
          mind.note = 'شروع نقشه ذهن'
        }
      }
    }

    return NextResponse.json({
      success: true,
      map: {
        domain: 'unified',
        domainTitle: 'نقشه کامل ذهن',
        summary: parsed.summary || 'نقشه یکپارچه به‌روز شد.',
        updatedAt: new Date().toISOString(),
        nodes: merged,
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: 'خطای داخلی' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'analyzer-unified' })
}
