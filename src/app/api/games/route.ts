import { NextRequest, NextResponse } from 'next/server'
import { getAIConfig, aiHeaders } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type MatchPair = { id: string; left: string; right: string }
type TfItem = { id: string; statement: string; truth: boolean; explain: string }

const MATCH_POOL: MatchPair[] = [
  { id: 'm1', left: 'معرفت‌شناسی', right: 'چیستی و امکان دانش' },
  { id: 'm2', left: 'منطق', right: 'قواعد استدلال درست' },
  { id: 'm3', left: 'اخلاق', right: 'چه باید کرد؟' },
  { id: 'm4', left: 'فیزیک', right: 'نیرو و حرکت' },
  { id: 'm5', left: 'شیمی', right: 'مواد و واکنش‌ها' },
  { id: 'm6', left: 'زیست', right: 'جانداران و ژن' },
  { id: 'm7', left: 'تاریخ', right: 'رویدادها در بستر زمان' },
  { id: 'm8', left: 'اقتصاد', right: 'کمیابی و انتخاب' },
  { id: 'm9', left: 'روان‌شناسی', right: 'ذهن و رفتار' },
  { id: 'm10', left: 'برنامه‌نویسی', right: 'الگوریتم و کد' },
  { id: 'm11', left: 'ریاضی', right: 'عدد و ساختار' },
  { id: 'm12', left: 'نقشه ذهنی', right: 'نمایش دانش تو در WAIMA' },
]

const TF_POOL: TfItem[] = [
  { id: 't1', statement: 'معرفت‌شناسی فقط درباره تاریخ پادشاهان است.', truth: false, explain: 'معرفت‌شناسی درباره دانش است.' },
  { id: 't2', statement: 'نقشه ذهنی WAIMA با گفتگو به‌روز می‌شود.', truth: true, explain: 'بعد از گفتگو نقشه ساخته/به‌روز می‌شود.' },
  { id: 't3', statement: 'XP فقط از بازی به‌دست می‌آید و گفتگو هیچ تأثیری ندارد.', truth: false, explain: 'گفتگو هم می‌تواند XP بدهد.' },
  { id: 't4', statement: 'منطق به استدلال درست کمک می‌کند.', truth: true, explain: 'منطق قواعد استدلال است.' },
  { id: 't5', statement: 'کمیابی یعنی منابع نامحدودند.', truth: false, explain: 'کمیابی یعنی محدودیت منابع.' },
  { id: 't6', statement: 'اخلاق درباره «چه باید کرد» است.', truth: true, explain: 'اخلاق هنجاری است.' },
  { id: 't7', statement: 'گفتگوی جهانی پیام‌های قدیمی‌تر از ۲۴ ساعت را نگه می‌دارد.', truth: false, explain: 'پیام‌های قدیمی‌تر از ۲۴ ساعت پاک می‌شوند.' },
  { id: 't8', statement: 'هر روز می‌توان مجموعه جدیدی از سؤالات بازی داشت.', truth: true, explain: 'بازی‌ها روزانه تازه‌سازی می‌شوند.' },
]

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function hash(s: string) {
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

function shuffle<T>(arr: T[], rand: () => number) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function aiGames(kind: string, date: string, locale: string) {
  const cfg = getAIConfig('games')
  const { baseUrl, model } = cfg
  const keyPool = cfg.keys.length ? cfg.keys : cfg.apiKey ? [cfg.apiKey] : []
  if (!keyPool.length) return null

  const lang = locale === 'en' ? 'English' : locale === 'ar' ? 'Arabic' : 'Persian (Farsi)'

  const prompt =
    kind === 'truefalse'
      ? `Generate 8 true/false educational statements for WAIMA learning app.
Date seed: ${date}. Language: ${lang}.
Return ONLY JSON array: [{"id":"t1","statement":"...","truth":true,"explain":"..."}]
Topics: philosophy, science, history, logic, knowledge maps, learning.
No markdown.`
      : `Generate 6 concept-matching pairs for WAIMA learning app.
Date seed: ${date}. Language: ${lang}.
Return ONLY JSON array: [{"id":"m1","left":"concept","right":"short definition"}]
Topics: philosophy, science, history, logic, mind maps.
No markdown.`

  for (const tryKey of keyPool) {
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: aiHeaders(tryKey),
        body: JSON.stringify({
          model,
          temperature: 0.8,
          messages: [
            { role: 'system', content: 'You output only valid JSON arrays for educational games.' },
            { role: 'user', content: prompt },
          ],
        }),
      })
      if (!resp.ok) continue
      const data = await resp.json()
      const content = data?.choices?.[0]?.message?.content || ''
      const m = content.match(/\[[\s\S]*\]/)
      if (!m) continue
      const parsed = JSON.parse(m[0])
      if (!Array.isArray(parsed) || parsed.length < 3) continue
      return parsed
    } catch {
      continue
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const kind = String(body?.kind || 'match')
  const date = String(body?.date || dayKey())
  const salt = String(body?.salt || body?.session || Date.now())
  const locale = String(body?.locale || 'fa')
  const seed = hash(`${date}|${kind}|waima`)
  const rand = mulberry32(seed)

  const ai = await aiGames(kind, `${date}:${salt}`, locale)

  if (kind === 'truefalse') {
    let items: TfItem[] = []
    if (ai) {
      items = ai
        .map((x: any, i: number) => ({
          id: String(x.id || `t-${date}-${i}`),
          statement: String(x.statement || ''),
          truth: Boolean(x.truth),
          explain: String(x.explain || ''),
        }))
        .filter((x: TfItem) => x.statement)
        .slice(0, 8)
    }
    if (items.length < 4) {
      items = shuffle(TF_POOL, rand).slice(0, 8)
      return NextResponse.json({ success: true, date, kind, items, source: 'fallback' })
    }
    return NextResponse.json({ success: true, date, kind, items, source: 'ai' })
  }

  // match
  let pairs: MatchPair[] = []
  if (ai) {
    pairs = ai
      .map((x: any, i: number) => ({
        id: String(x.id || `m-${date}-${i}`),
        left: String(x.left || ''),
        right: String(x.right || ''),
      }))
      .filter((p: MatchPair) => p.left && p.right)
      .slice(0, 6)
  }
  if (pairs.length < 4) {
    pairs = shuffle(MATCH_POOL, rand).slice(0, 6)
    const lefts = shuffle(
      pairs.map((p) => ({ id: p.id, text: p.left })),
      rand
    )
    const rights = shuffle(
      pairs.map((p) => ({ id: p.id, text: p.right })),
      rand
    )
    return NextResponse.json({
      success: true,
      date,
      kind: 'match',
      pairs,
      lefts,
      rights,
      source: 'fallback',
    })
  }

  const lefts = shuffle(
    pairs.map((p) => ({ id: p.id, text: p.left })),
    rand
  )
  const rights = shuffle(
    pairs.map((p) => ({ id: p.id, text: p.right })),
    rand
  )
  return NextResponse.json({
    success: true,
    date,
    kind: 'match',
    pairs,
    lefts,
    rights,
    source: 'ai',
  })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', games: ['match', 'truefalse'], daily: true })
}
