import { NextRequest, NextResponse } from 'next/server'

const domainNames: Record<string, string> = {
  general: 'دانش عمومی',
  philosophy: 'فلسفه',
  programming: 'برنامه‌نویسی',
  history: 'تاریخ',
  psychology: 'روان‌شناسی',
  religion: 'دین و الهیات',
  ethics: 'اخلاق',
  physics: 'فیزیک',
  chemistry: 'شیمی',
  math: 'ریاضی',
  biology: 'زیست‌شناسی',
  literature: 'ادبیات',
  economics: 'اقتصاد',
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.gapgpt.app/v1').replace(/\/$/, '')

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OPENAI_API_KEY تنظیم نشده است' }, { status: 500 })
    }

    const body = await req.json()
    const messages = body?.messages as { role: 'user' | 'assistant' | 'system'; content: string }[]
    const domain = (body?.domain as string) || 'general'

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'messages الزامی است' }, { status: 400 })
    }

    const domainTitle = domainNames[domain] || domain

    const systemPrompt = `تو ارزیاب کوتاه‌گوی پلتفرم «من کیستم؟» هستی.
حوزهٔ فعلی: ${domainTitle}

قوانین سخت:
- فارسی، صمیمی، واضح
- هر پاسخ حداکثر ۸۰ تا ۱۲۰ کلمه
- فقط ۱ سؤال بپرس
- اگر نکته آموزشی می‌گویی، در ۱-۲ جمله باشد
- کتاب فقط گاهی و در یک خط
- از پرگویی و لیست‌های بلند پرهیز کن`

    // فقط چند پیام اخیر برای سرعت
    const recent = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: String(m.content || '').slice(0, 1200),
      }))

    const openaiMessages = [{ role: 'system', content: systemPrompt }, ...recent]

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        temperature: 0.55,
        max_tokens: 280,
      }),
    })

    const text = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: 'خطا از GapGPT', details: text }, { status: 502 })
    }

    const data = JSON.parse(text)
    const content = data?.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.'
    return NextResponse.json({ success: true, content })
  } catch {
    return NextResponse.json({ success: false, error: 'خطای داخلی سرور' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'chatbot' })
}
