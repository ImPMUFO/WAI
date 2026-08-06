import { NextRequest, NextResponse } from 'next/server'

/** پروکسی TTS رایگان برای fa / ar / en */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const text = (searchParams.get('text') || '').trim().slice(0, 180)
    let lang = (searchParams.get('lang') || 'fa').toLowerCase()
    if (!text) {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }
    if (lang.startsWith('fa') || lang === 'per') lang = 'fa'
    else if (lang.startsWith('ar')) lang = 'ar'
    else if (lang.startsWith('en')) lang = 'en'
    else lang = 'fa'

    const url =
      'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' +
      encodeURIComponent(lang) +
      '&q=' +
      encodeURIComponent(text)

    const r = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        Referer: 'https://translate.google.com/',
      },
    })

    if (!r.ok) {
      return NextResponse.json({ error: 'tts upstream failed', status: r.status }, { status: 502 })
    }

    const buf = await r.arrayBuffer()
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'tts error' }, { status: 500 })
  }
}
