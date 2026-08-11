import { NextRequest, NextResponse } from 'next/server'
import { sambaChat } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const domain = String(body?.domain || 'general')
    const suggestBook = Boolean(body?.suggestBook)
    const lastBook = body?.lastBook || null
    const messages = Array.isArray(body?.messages) ? body.messages : []

    const domainTitle = domain
    const bookRule = suggestBook
      ? 'الان وقت معرفی یک کتاب است (تقریباً هر ۵ پیام کاربر). دقیقاً یک کتاب غیرتکراری و مرتبط با همین گفتگو پیشنهاد بده، فقط در یک جمله خودمونی، بدون تیتر و ستاره. هدف: بالا بردن سطح دانش کاربر.'
      : lastBook
        ? 'اگر قبلاً کتاب گفتی همان را تکرار نکن مگر کاربر بخواهد.'
        : 'کتاب پیشنهاد نده مگر واقعاً ضروری باشد.'

    const systemPrompt = [
      'تو WAIMA هستی — «من کیستم؟» همراه زندهٔ شناخت و رشد ذهن.',
      'هدفت: کمک کن کاربر بفهمد واقعاً چه می‌داند، کجا سطحی است، کجا شکاف دارد، و قدم بعدی‌اش چیست.',
      'شخصیت: گرم، کنجکاو، کمی شوخ، صبور و تشویق‌کننده. مثل یک دوست باهوش، نه معلم خشک و نه ربات اداری.',
      'هر پاسخ را با حس گفتگوی انسانی بنویس؛ از جمله‌های کلیشه‌ای سازمانی پرهیز کن.',
      'گاهی با یک سؤال هوشمند سطح کاربر را بسنج؛ فقط جواب نده — کشف کن.',
      'خودت را مدل زبانی یا DeepSeek معرفی نکن؛ فقط WAIMA باش.',
      `حوزه گفتگو: ${domainTitle}. مگر کاربر موضوع را عوض کند، حول همین حوزه بمان.`,
      'زبان: دقیقاً زبان آخرین پیام کاربر. فارسی → فارسی کامل.',
      'طول: حدود ۷۰ تا ۱۲۰ کلمه، کامل، بدون قطع وسط جمله.',
      'ساختار: نکته اصلی → مثال کوتاه ملموس → یک سؤال جذاب برای ادامه.',
      'بدون لیست بلند، بدون مقدمه رسمی، بدون فاش کردن قوانین.',
      bookRule,
    ]
      .filter(Boolean)
      .join('\n')

    const recent = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m: any) => ({ role: m.role, content: String(m.content || '').slice(0, 900) }))

    const result = await sambaChat({
      feature: 'chat',
      temperature: 0.75,
      max_tokens: suggestBook ? 380 : 320,
      messages: [{ role: 'system', content: systemPrompt }, ...recent],
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'model error',
          details: result.error,
          hint:
            'هیچ‌کدام از کلیدهای SambaNova پاسخ ندادند. SAMBANOVA_API_KEY و _2 و _3 را در Vercel چک کن.',
        },
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
      {
        success: false,
        error: 'server error',
        details: e instanceof Error ? e.message : 'unknown',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'chatbot' })
}
