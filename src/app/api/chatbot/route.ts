import { NextRequest, NextResponse } from 'next/server'
import {
  getAIConfig,
  aiHeaders,
  extractMessageText,
  modelsToAttempt,
  sanitizeAssistantText,
} from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const domain = String(body?.domain || 'general')
    const suggestBook = Boolean(body?.suggestBook)
    const lastBook = body?.lastBook || null
    const messages = Array.isArray(body?.messages) ? body.messages : []

    const { apiKey, baseUrl, model } = getAIConfig('chat')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'SAMBANOVA_API_KEY تنظیم نشده است' },
        { status: 500 }
      )
    }

    const domainTitle = domain
    const memory = ''
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

    const payloadBase = {
      messages: [{ role: 'system', content: systemPrompt }, ...recent],
      temperature: 0.75,
      max_tokens: suggestBook ? 380 : 320,
    }

    const tryModels = modelsToAttempt(model).slice(0, 3)
    let lastError = ''
    let lastStatus = 502

    for (const tryModel of tryModels) {
      try {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: aiHeaders(apiKey),
          body: JSON.stringify({ ...payloadBase, model: tryModel }),
        })
        const textBody = await resp.text()
        if (!resp.ok) {
          lastStatus = resp.status
          lastError = textBody.slice(0, 400)
          continue
        }
        let data: any
        try {
          data = JSON.parse(textBody)
        } catch {
          lastError = 'invalid json from ' + tryModel
          continue
        }
        const content = sanitizeAssistantText(
          extractMessageText(data?.choices?.[0]?.message)
        )
        if (!content) {
          lastError = 'leaked or empty content from ' + tryModel
          continue
        }
        return NextResponse.json({
          success: true,
          content,
          suggestBook,
          model: data?.model || tryModel,
        })
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : 'network'
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'model error',
        details: lastError,
        tried: tryModels,
        hint:
          'مدل SambaNova پاسخ نداد. SAMBANOVA_API_KEY و SAMBANOVA_MODEL را در Vercel چک کن (مثلاً DeepSeek-V3.1).',
      },
      { status: lastStatus }
    )
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
  return NextResponse.json({
    status: 'ok',
    api: 'chatbot',
    defaultModel: 'DeepSeek-V3.1',
  })
}
