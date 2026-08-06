import { NextRequest, NextResponse } from 'next/server'

export type QuizItem = {
  id: string
  domain: string
  question: string
  options: string[]
  answer: string
  explain: string
}

/** سؤالات پشتیبان اگر API مدل در دسترس نباشد */
const FALLBACK: QuizItem[] = [
  {
    id: 'fb-p1',
    domain: 'philosophy',
    question: 'کدام گزینه بهتر معرفت‌شناسی را توصیف می‌کند؟',
    options: ['بررسی چیستی و امکان معرفت', 'فقط تاریخ پادشاهان', 'قیمت‌گذاری کالا', 'ساخت سخت‌افزار'],
    answer: 'بررسی چیستی و امکان معرفت',
    explain: 'معرفت‌شناسی درباره دانش و حدود آن است.',
  },
  {
    id: 'fb-h1',
    domain: 'history',
    question: 'برای فهم یک رویداد تاریخی چه چیزی مهم‌تر است؟',
    options: ['علت و زمینه', 'فقط رنگ پرچم', 'فقط یک تاریخ بدون بستر', 'نام تصادفی افراد'],
    answer: 'علت و زمینه',
    explain: 'تاریخ با علت‌ها و بستر معنا پیدا می‌کند.',
  },
  {
    id: 'fb-m1',
    domain: 'math',
    question: 'اگر a=۴ و b=۶، مقدار a+b؟',
    options: ['۱۰', '۱۲', '۲', '۴۶'],
    answer: '۱۰',
    explain: '۴+۶=۱۰',
  },
  {
    id: 'fb-phy1',
    domain: 'physics',
    question: 'نیرو بیشتر با کدام مفهوم مرتبط است؟',
    options: ['تغییر حرکت (شتاب)', 'رنگ نور فقط', 'طعم مواد', 'قافیه شعر'],
    answer: 'تغییر حرکت (شتاب)',
    explain: 'نیرو می‌تواند سرعت یا جهت حرکت را تغییر دهد.',
  },
  {
    id: 'fb-c1',
    domain: 'chemistry',
    question: 'آب از چه ساخته شده؟',
    options: ['هیدروژن و اکسیژن', 'آهن و مس', 'کربن و طلا', 'نیتروژن و هلیوم'],
    answer: 'هیدروژن و اکسیژن',
    explain: 'H₂O',
  },
  {
    id: 'fb-e1',
    domain: 'ethics',
    question: 'سؤال محوری اخلاق کدام است؟',
    options: ['چه باید کرد / چه چیزی درست است؟', 'ساعت چند است؟', 'رنگ دیوار چیست؟', 'هوا چند درجه است؟'],
    answer: 'چه باید کرد / چه چیزی درست است؟',
    explain: 'اخلاق درباره درستی و مسئولیت است.',
  },
  {
    id: 'fb-pr1',
    domain: 'programming',
    question: 'کدام ساختار برای جفت کلید-مقدار رایج است؟',
    options: ['دیکشنری / آبجکت', 'فقط عدد صحیح', 'فقط فضای خالی', 'کابل شبکه'],
    answer: 'دیکشنری / آبجکت',
    explain: 'map و dict و object مفهوم مشابه‌اند.',
  },
  {
    id: 'fb-psy1',
    domain: 'psychology',
    question: 'سوگیری شناختی چه می‌کند؟',
    options: ['می‌تواند تصمیم‌گیری را منحرف کند', 'همیشه محاسبات را دقیق‌تر می‌کند', 'دما را تغییر می‌دهد', 'فقط حافظه عضلانی است'],
    answer: 'می‌تواند تصمیم‌گیری را منحرف کند',
    explain: 'سوگیری‌ها قضاوت را از مسیر منطقی منحرف می‌کنند.',
  },
  {
    id: 'fb-bio1',
    domain: 'biology',
    question: 'واحد پایه وراثت معمولاً چیست؟',
    options: ['ژن', 'وات', 'پیکسل', 'بایت شبکه'],
    answer: 'ژن',
    explain: 'ژن اطلاعات وراثتی را حمل می‌کند.',
  },
  {
    id: 'fb-ec1',
    domain: 'economics',
    question: 'کمیابی بیشتر به چه اشاره دارد؟',
    options: ['منابع محدود و ضرورت انتخاب', 'بی‌نهایت بودن همه چیز', 'حذف کامل نیاز', 'فقط چاپ پول'],
    answer: 'منابع محدود و ضرورت انتخاب',
    explain: 'اقتصاد با انتخاب در محدودیت سروکار دارد.',
  },
]

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function shuffle<T>(arr: T[], seed: number) {
  const a = [...arr]
  let s = seed || 1
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const locale = (body?.locale as string) || 'fa'
    const level = Number(body?.level) || 1
    const domains = Array.isArray(body?.domains) ? (body.domains as string[]) : []
    const date = (body?.date as string) || dayKey()

    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.gapgpt.app/v1').replace(/\/$/, '')

    if (!apiKey) {
      const seed = date.split('-').join('').length + level
      return NextResponse.json({
        success: true,
        source: 'fallback',
        date,
        items: shuffle(FALLBACK, seed).slice(0, 10),
      })
    }

    const domainHint = domains.length ? domains.join(', ') : 'general knowledge, philosophy, science, history'
    const lang =
      locale === 'en' ? 'English' : locale === 'ar' ? 'Arabic' : 'Persian (Farsi)'

    const system = `You generate educational multiple-choice quizzes for WAIMA learning app.
Return ONLY valid JSON array of 10 objects with keys:
id, domain, question, options (array of exactly 4 strings), answer (must equal one option), explain
Rules:
- Language of question/options/explain: ${lang}
- Exactly 4 options each, one correct
- Difficulty around user level ${level} (1=easy, 10=hard)
- Prefer domains: ${domainHint}
- Fresh questions for date ${date}; avoid trivial duplicates
- ids unique strings like d-${date}-01
No markdown, no commentary, JSON array only.`

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `Generate today's quiz for ${date}.` },
        ],
        temperature: 0.8,
        max_tokens: 2200,
      }),
    })

    const raw = await resp.text()
    if (!resp.ok) {
      const seed = Number(date.replace(/-/g, '')) + level
      return NextResponse.json({
        success: true,
        source: 'fallback',
        date,
        items: shuffle(FALLBACK, seed).slice(0, 10),
        warning: 'model_error',
      })
    }

    let content = ''
    try {
      content = JSON.parse(raw)?.choices?.[0]?.message?.content || ''
    } catch {
      content = ''
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/)
    let items: QuizItem[] = []
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as QuizItem[]
        items = (parsed || [])
          .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length === 4 && q.answer)
          .map((q, i) => ({
            id: String(q.id || `${date}-${i}`),
            domain: String(q.domain || 'general'),
            question: String(q.question),
            options: q.options.map(String).slice(0, 4),
            answer: String(q.answer),
            explain: String(q.explain || ''),
          }))
          .filter((q) => q.options.includes(q.answer))
      } catch {
        items = []
      }
    }

    if (items.length < 5) {
      const seed = Number(date.replace(/-/g, '')) + level
      items = shuffle(FALLBACK, seed).slice(0, 10)
      return NextResponse.json({ success: true, source: 'fallback', date, items })
    }

    return NextResponse.json({ success: true, source: 'ai', date, items: items.slice(0, 12) })
  } catch {
    return NextResponse.json({
      success: true,
      source: 'fallback',
      date: dayKey(),
      items: FALLBACK.slice(0, 10),
    })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'daily-quiz' })
}
