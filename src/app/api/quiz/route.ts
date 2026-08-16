import { NextRequest, NextResponse } from 'next/server'
import { getAIConfig, aiHeaders } from '@/lib/ai'

export type QuizItem = {
  id: string
  domain: string
  question: string
  options: string[]
  answer: string
  explain: string
}

const FALLBACK: QuizItem[] = [
  { id: 'fb-p1', domain: 'philosophy', question: 'کدام گزینه بهتر معرفت‌شناسی را توصیف می‌کند؟', options: ['بررسی چیستی و امکان معرفت', 'فقط تاریخ پادشاهان', 'قیمت‌گذاری کالا', 'ساخت سخت‌افزار'], answer: 'بررسی چیستی و امکان معرفت', explain: 'معرفت‌شناسی درباره دانش و حدود آن است.' },
  { id: 'fb-h1', domain: 'history', question: 'برای فهم یک رویداد تاریخی چه چیزی مهم‌تر است؟', options: ['علت و زمینه', 'فقط رنگ پرچم', 'فقط یک تاریخ بدون بستر', 'نام تصادفی افراد'], answer: 'علت و زمینه', explain: 'تاریخ با علت‌ها و بستر معنا پیدا می‌کند.' },
  { id: 'fb-m1', domain: 'math', question: 'اگر a=۴ و b=۶، مقدار a+b؟', options: ['۱۰', '۱۲', '۲', '۴۶'], answer: '۱۰', explain: '۴+۶=۱۰' },
  { id: 'fb-phy1', domain: 'physics', question: 'نیرو بیشتر با کدام مفهوم مرتبط است؟', options: ['تغییر حرکت (شتاب)', 'رنگ نور فقط', 'طعم مواد', 'قافیه شعر'], answer: 'تغییر حرکت (شتاب)', explain: 'نیرو می‌تواند سرعت یا جهت حرکت را تغییر دهد.' },
  { id: 'fb-c1', domain: 'chemistry', question: 'آب از چه ساخته شده؟', options: ['هیدروژن و اکسیژن', 'آهن و مس', 'کربن و طلا', 'نیتروژن و هلیوم'], answer: 'هیدروژن و اکسیژن', explain: 'H₂O' },
  { id: 'fb-e1', domain: 'ethics', question: 'سؤال محوری اخلاق کدام است؟', options: ['چه باید کرد / چه چیزی درست است؟', 'ساعت چند است؟', 'رنگ دیوار چیست؟', 'هوا چند درجه است؟'], answer: 'چه باید کرد / چه چیزی درست است؟', explain: 'اخلاق درباره درستی و مسئولیت است.' },
  { id: 'fb-pr1', domain: 'programming', question: 'کدام ساختار برای جفت کلید-مقدار رایج است؟', options: ['دیکشنری / آبجکت', 'فقط عدد صحیح', 'فقط فضای خالی', 'کابل شبکه'], answer: 'دیکشنری / آبجکت', explain: 'map و dict و object مفهوم مشابه‌اند.' },
  { id: 'fb-psy1', domain: 'psychology', question: 'سوگیری شناختی چه می‌کند؟', options: ['می‌تواند تصمیم‌گیری را منحرف کند', 'همیشه محاسبات را دقیق‌تر می‌کند', 'دما را تغییر می‌دهد', 'فقط حافظه عضلانی است'], answer: 'می‌تواند تصمیم‌گیری را منحرف کند', explain: 'سوگیری‌ها قضاوت را از مسیر منطقی منحرف می‌کنند.' },
  { id: 'fb-bio1', domain: 'biology', question: 'واحد پایه وراثت معمولاً چیست؟', options: ['ژن', 'وات', 'پیکسل', 'بایت شبکه'], answer: 'ژن', explain: 'ژن اطلاعات وراثتی را حمل می‌کند.' },
  { id: 'fb-ec1', domain: 'economics', question: 'کمیابی بیشتر به چه اشاره دارد؟', options: ['منابع محدود و ضرورت انتخاب', 'بی‌نهایت بودن همه چیز', 'حذف کامل نیاز', 'فقط چاپ پول'], answer: 'منابع محدود و ضرورت انتخاب', explain: 'اقتصاد با انتخاب در محدودیت سروکار دارد.' },
]

function dayKey() { return new Date().toISOString().slice(0, 10) }

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function stableQuestionId(question: string) {
  const normalized = question.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[؟?!.,،؛:«»"'`]/g, '')
  return `q-${hash(normalized).toString(36)}`
}

function shuffle<T>(arr: T[], seed: number) {
  const a = [...arr]
  let x = seed >>> 0
  for (let i = a.length - 1; i > 0; i--) {
    x += 0x6d2b79f5
    let t = x
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    const j = Math.floor(r * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function normalizeItem(q: any, i: number): QuizItem | null {
  if (!q?.question || !Array.isArray(q.options) || q.options.length < 2) return null
  const options = q.options.map((o: unknown) => String(o).trim()).filter(Boolean).slice(0, 4)
  let answer = String(q.answer ?? '').trim()
  if (/^[0-3]$/.test(answer) && options[Number(answer)]) answer = options[Number(answer)]
  if (/^[1-4]$/.test(answer) && options[Number(answer) - 1]) answer = options[Number(answer) - 1]
  if (!options.includes(answer)) answer = options.find((o) => o === answer || o.includes(answer) || answer.includes(o)) || options[0]
  while (options.length < 4) options.push(`گزینه ${options.length + 1}`)
  return {
    id: stableQuestionId(String(q.question)) || `q-fallback-${i}`,
    domain: String(q.domain || 'general'),
    question: String(q.question),
    options,
    answer,
    explain: String(q.explain || ''),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const locale = String(body?.locale || 'fa')
    const level = Number(body?.level) || 1
    const domains = Array.isArray(body?.domains) ? body.domains.map(String) : []
    const date = String(body?.date || dayKey())
    const excluded = new Set(Array.isArray(body?.excludeIds) ? body.excludeIds.map(String) : [])

    const cfg = getAIConfig('games')
    const keyPool = cfg.keys.length ? cfg.keys : cfg.apiKey ? [cfg.apiKey] : []

    if (!keyPool.length) {
      const items = FALLBACK.filter((q) => !excluded.has(q.id) && !excluded.has(stableQuestionId(q.question)))
      return NextResponse.json({ success: true, source: 'fallback', date, items: shuffle(items, hash(date)).slice(0, 10) })
    }

    const lang = locale === 'en' ? 'English' : locale === 'ar' ? 'Arabic' : 'Persian (Farsi)'
    const domainHint = domains.length ? domains.join(', ') : 'general knowledge, philosophy, science, history'

    const prompt = `Generate 10 educational multiple-choice questions for WAIMA.
Language: ${lang}
Difficulty around level ${level}
Preferred domains: ${domainHint}
Return ONLY JSON array.
Each item must contain question, domain, options (exactly 4), answer (exact option text), explain.
Do not repeat ideas within the batch.
Do not use markdown.`

    let content = ''
    for (const key of keyPool) {
      try {
        const resp = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: aiHeaders(key),
          body: JSON.stringify({
            model: cfg.model,
            temperature: 0.8,
            max_tokens: 2000,
            messages: [
              { role: 'system', content: 'Output only valid JSON arrays for educational quizzes.' },
              { role: 'user', content: prompt },
            ],
          }),
        })
        if (!resp.ok) continue
        const data = await resp.json()
        content = data?.choices?.[0]?.message?.content || ''
        if (content) break
      } catch {}
    }

    const match = content.match(/\[[\s\S]*\]/)
    let items: QuizItem[] = []
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        items = parsed.map((q: any, i: number) => normalizeItem(q, i)).filter(Boolean) as QuizItem[]
      } catch {}
    }

    items = items
      .filter((q) => !excluded.has(q.id) && !excluded.has(stableQuestionId(q.question)))
      .filter((q, i, arr) => arr.findIndex((x) => x.id === q.id) === i)

    if (items.length < 5) {
      items = FALLBACK
        .filter((q) => !excluded.has(q.id) && !excluded.has(stableQuestionId(q.question)))
        .slice(0, 10)
    }

    return NextResponse.json({
      success: true,
      source: items.length && content ? 'ai' : 'fallback',
      date,
      items: shuffle(items, hash(`${date}|${locale}|${level}`)).slice(0, 10),
    })
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
  return NextResponse.json({ status: 'ok', api: 'daily-quiz-stable-ids' })
}
