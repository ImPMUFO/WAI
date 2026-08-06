import { NextRequest, NextResponse } from 'next/server'

export type QuizItem = {
  id: string
  domain: string
  question: string
  options: string[]
  answer: string
  explain: string
}

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

function hashSeed(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleWith<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function shuffleOptions(item: QuizItem, rand: () => number): QuizItem {
  const answer = String(item.answer || '').trim()
  let options = (item.options || []).map((o) => String(o).trim()).filter(Boolean)
  if (answer && !options.includes(answer)) {
    options = [answer, ...options].slice(0, 4)
  }
  while (options.length < 4) options.push(`گزینه ${options.length + 1}`)
  options = options.slice(0, 4)
  options = shuffleWith(shuffleWith(options, rand), () => Math.random())
  if (answer && options[0] === answer && Math.random() < 0.8) {
    const j = 1 + Math.floor(Math.random() * 3)
    const t = options[0]; options[0] = options[j]; options[j] = t
  }
  if (answer && !options.includes(answer)) {
    const idx = Math.floor(rand() * 4)
    options[idx] = answer
  }
  return { ...item, options, answer }
}

function prepareItems(items: QuizItem[], seedKey: string): QuizItem[] {
  const rand = mulberry32(hashSeed(seedKey))
  const shuffledQuestions = shuffleWith(items, rand)
  return shuffledQuestions.map((q, i) => {
    const r = mulberry32(hashSeed(`${seedKey}:${q.id}:${i}`))
    return shuffleOptions(q, r)
  })
}

function normalizeItem(q: any, i: number, date: string): QuizItem | null {
  if (!q || !q.question) return null
  const options = Array.isArray(q.options) ? q.options.map((o: unknown) => String(o).trim()) : []
  if (options.length < 2) return null
  let answer = String(q.answer ?? '').trim()
  if (/^[0-3]$/.test(answer) && options[Number(answer)]) answer = options[Number(answer)]
  else if (/^[1-4]$/.test(answer) && options[Number(answer) - 1]) answer = options[Number(answer) - 1]
  if (!options.includes(answer)) {
    const hit = options.find((o: string) => o === answer || o.includes(answer) || answer.includes(o))
    if (hit) answer = hit
    else answer = options[0]
  }
  return {
    id: String(q.id || `${date}-${i}`),
    domain: String(q.domain || 'general'),
    question: String(q.question),
    options: options.slice(0, 4),
    answer,
    explain: String(q.explain || ''),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const locale = (body?.locale as string) || 'fa'
    const level = Number(body?.level) || 1
    const domains = Array.isArray(body?.domains) ? (body.domains as string[]) : []
    const date = (body?.date as string) || dayKey()
    const seedKey = `${date}|${level}|${locale}|${domains.join(',')}`

    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.gapgpt.app/v1').replace(/\/$/, '')

    if (!apiKey) {
      return NextResponse.json({
        success: true,
        source: 'fallback',
        date,
        items: prepareItems(FALLBACK, seedKey).slice(0, 10),
      })
    }

    const domainHint = domains.length ? domains.join(', ') : 'general knowledge, philosophy, science, history'
    const lang = locale === 'en' ? 'English' : locale === 'ar' ? 'Arabic' : 'Persian (Farsi)'

    const system = `You generate educational multiple-choice quizzes for WAIMA.
Return ONLY a valid JSON array of 10 objects with keys:
id, domain, question, options (exactly 4 strings), answer (exact text of the correct option), explain

CRITICAL RULES:
- Language: ${lang}
- Exactly 4 options
- answer must be EXACTLY equal to one of the options strings
- Put the correct option in a RANDOM position (not always first)
- Difficulty around level ${level}
- Prefer domains: ${domainHint}
- Fresh for date ${date}
No markdown, JSON array only.`

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
          { role: 'user', content: `Generate today's quiz for ${date}. Randomize correct option index.` },
        ],
        temperature: 0.85,
        max_tokens: 2200,
      }),
    })

    const raw = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({
        success: true,
        source: 'fallback',
        date,
        items: prepareItems(FALLBACK, seedKey).slice(0, 10),
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
        const parsed = JSON.parse(jsonMatch[0]) as any[]
        items = (parsed || []).map((q, i) => normalizeItem(q, i, date)).filter(Boolean) as QuizItem[]
      } catch {
        items = []
      }
    }

    if (items.length < 5) {
      return NextResponse.json({
        success: true,
        source: 'fallback',
        date,
        items: prepareItems(FALLBACK, seedKey).slice(0, 10),
      })
    }

    return NextResponse.json({
      success: true,
      source: 'ai',
      date,
      items: prepareItems(items, seedKey).slice(0, 12),
    })
  } catch {
    return NextResponse.json({
      success: true,
      source: 'fallback',
      date: dayKey(),
      items: prepareItems(FALLBACK, dayKey()).slice(0, 10),
    })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'daily-quiz-shuffled' })
}
