import { NextRequest, NextResponse } from 'next/server'

const domainNames: Record<string, string> = {
  philosophy: 'فلسفه',
  programming: 'برنامه‌نویسی',
  history: 'تاریخ',
  psychology: 'روان‌شناسی',
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.gapgpt.app/v1').replace(/\/$/, '')

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENAI_API_KEY تنظیم نشده است' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const messages = body?.messages as { role: 'user' | 'assistant' | 'system'; content: string }[]
    const domain = (body?.domain as string) || 'philosophy'

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'messages الزامی است' },
        { status: 400 }
      )
    }

    const domainTitle = domainNames[domain] || domain

    // --- بخش اصلاح شده: سیستم پرامپت جدید برای تبدیل شدن به معلم جذاب ---
    const systemPrompt = `تو یک معلم هوشمند، جذاب و بسیار باهوش در حوزه ${domainTitle} هستی.
وظیفه تو در پلتفرم «من کیستم؟ پایگاه دانش» این است که علاوه بر ارزیابی، به کاربر آموزش بدهی.

در هر پاسخ، حتماً از این ساختار دقیق استفاده کن:

[آموزش]: یک نکته علمی، تاریخی یا فلسفی بسیار جالب، عجیب یا کاربردی درباره موضوعی که در موردش صحبت می‌کنیم بگو. سعی کن کاربر را شگفت‌زده کنی!
[ارزیابی]: سپس یک سوال هوشمندانه و چالش‌برانگیز بپرس تا بفهمی چقدر موضوع را درک کرده است.
[کتاب]: در نهایت، نام یک کتاب معتبر (ترجیحاً فارسی یا ترجمه شده) که مرتبط با این بحث است را بیاور و در یک جمله کوتاه بگو چرا باید آن را بخواند.

همیشه فارسی روان و صمیمی حرف بزن. هدف تو: آموزش، ارزیابی و پیشنهاد مسیر رشد است.`

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: String(m.content || '').slice(0, 4000),
        })),
    ]

    const resp = await fetch(`${baseUrl}/chat/completations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1200,
      }),
    })

    const text = await resp.text()
    if (!resp.ok) {
      return NextResponse.json(
        { success: false, error: 'خطا از GapGPT', details: text },
        { status: 502 }
      )
    }

    const data = JSON.parse(text)
    const content = data?.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.'

    return NextResponse.json({ success: true, content })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: 'خطای داخلی سرور' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'gapgpt' })
}
