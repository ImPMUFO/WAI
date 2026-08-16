import { NextRequest, NextResponse } from 'next/server'
import { waimaChat } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const domain = String(body?.domain || 'general')
    const suggestBook = Boolean(body?.suggestBook)
    const lastBook = body?.lastBook || null
    const messages = Array.isArray(body?.messages) ? body.messages : []

    const bookRule = suggestBook
      ? 'اگر لازم است فقط یک کتاب مرتبط و غیرتکراری معرفی کن؛ کوتاه.'
      : lastBook
        ? 'کتاب قبلی را تکرار نکن مگر کاربر بخواهد.'
        : 'کتاب پیشنهاد نده مگر ضروری باشد.'

    const systemPrompt = [
      'تو WAIMA هستی — همراه زنده شناخت و رشد ذهن.',
      'هدفت کمک به فهم دانش، نقاط قوت، شکاف‌ها و قدم بعدی یادگیری است.',
      'لحن گرم، طبیعی، صمیمی و کمی شوخ؛ نه اداری و نه تبلیغاتی.',
      'گاهی با یک سؤال هوشمند سطح کاربر را بسنج؛ فقط جواب نده.',
      'خودت را مدل زبانی، Gemini یا ChatGPT معرفی نکن؛ WAIMA باش.',
      `حوزه گفتگو: ${domain}.`,
      'زبان: دقیقاً زبان آخرین پیام کاربر.',
      'پاسخ طبیعی و نسبتاً کوتاه باشد؛ از مقدمه و فهرست‌های طولانی پرهیز کن.',
      bookRule,
    ].join('\n')

    const recent = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m: any) => ({ role: m.role, content: String(m.content || '').slice(0, 1800) }))

    const result = await waimaChat({
      feature: 'chat',
      temperature: 0.65,
      max_tokens: 1800,
      messages: [{ role: 'system', content: systemPrompt }, ...recent],
    })

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: 'model error', details: result.error },
        { status: result.status || 502 }
      )
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      suggestBook,
      model: result.model,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { success: false, error: 'server error', details: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'chatbot' })
}
