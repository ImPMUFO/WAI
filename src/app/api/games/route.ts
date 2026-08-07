import { NextRequest, NextResponse } from 'next/server'

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
  { id: 't6', statement: 'ژن واحد پایه وراثت است.', truth: true, explain: 'ژن اطلاعات وراثتی را حمل می‌کند.' },
  { id: 't7', statement: 'آب از هیدروژن و اکسیژن ساخته شده.', truth: true, explain: 'H₂O' },
  { id: 't8', statement: 'سوگیری شناختی همیشه تصمیم را بهتر می‌کند.', truth: false, explain: 'سوگیری می‌تواند منحرف کند.' },
  { id: 't9', statement: 'در WAIMA می‌توان چند حوزه دانش را روی یک نقشه دید.', truth: true, explain: 'نقشه یکپارچه است.' },
  { id: 't10', statement: 'نیرو هیچ ربطی به تغییر حرکت ندارد.', truth: false, explain: 'نیرو با شتاب/حرکت مرتبط است.' },
  { id: 't11', statement: 'اخلاق درباره «چه چیزی درست است» حرف می‌زند.', truth: true, explain: 'سؤال محوری اخلاق.' },
  { id: 't12', statement: 'دیکشنری در برنامه‌نویسی برای جفت کلید-مقدار رایج است.', truth: true, explain: 'map/object/dict' },
]

function dayKey() {
  return new Date().toISOString().slice(0, 10)
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

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const kind = String(body?.kind || 'match')
  const date = String(body?.date || dayKey())
  const seed = hash(`${date}|${kind}|waima`)
  const rand = mulberry32(seed)

  if (kind === 'truefalse') {
    const items = shuffle(TF_POOL, rand).slice(0, 8)
    return NextResponse.json({ success: true, date, kind, items })
  }

  // match
  const pairs = shuffle(MATCH_POOL, rand).slice(0, 6)
  const lefts = shuffle(
    pairs.map((p) => ({ id: p.id, text: p.left })),
    rand
  )
  const rights = shuffle(
    pairs.map((p) => ({ id: p.id, text: p.right })),
    rand
  )
  return NextResponse.json({ success: true, date, kind: 'match', pairs, lefts, rights })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', games: ['match', 'truefalse'] })
}
