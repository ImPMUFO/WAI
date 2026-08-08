import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function normalizeLang(lang: string): string {
  const l = (lang || 'fa').toLowerCase()
  if (l.startsWith('en')) return 'en'
  if (l.startsWith('ar')) return 'ar'
  return 'fa'
}

async function fetchGoogleTts(text: string, lang: string): Promise<ArrayBuffer | null> {
  // محدودیت طول Google TTS غیررسمی
  const q = text.slice(0, 100)
  const url =
    'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' +
    encodeURIComponent(lang) +
    '&q=' +
    encodeURIComponent(q)
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8,ar;q=0.7',
        Referer: 'https://translate.google.com/',
      },
      cache: 'no-store',
    })
    if (!r.ok) return null
    const buf = await r.arrayBuffer()
    if (!buf || buf.byteLength < 100) return null
    return buf
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const text = String(body?.text || '').trim().slice(0, 120)
    const lang = normalizeLang(String(body?.lang || 'fa'))
    if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })
    const buf = await fetchGoogleTts(text, lang)
    if (!buf) return NextResponse.json({ error: 'tts_unavailable' }, { status: 502 })
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'tts error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const text = (searchParams.get('text') || '').trim().slice(0, 120)
    const lang = normalizeLang(searchParams.get('lang') || 'fa')
    if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 })
    const buf = await fetchGoogleTts(text, lang)
    if (!buf) return NextResponse.json({ error: 'tts_unavailable' }, { status: 502 })
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'tts error' }, { status: 500 })
  }
}
