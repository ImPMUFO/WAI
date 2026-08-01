import { NextRequest, NextResponse } from 'next/server'

const domainNames: Record<string, string> = {
  philosophy: 'فلسفه',
  programming: 'برنامه‌نویسی',
  history: 'تاریخ',
  psychology: 'روان‌شناسی',
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY
    const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'DEEPSEEK_API_KEY تنظیم نشده است' },
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

    const systemPrompt = `تو ارزیاب دانش پلتفرم «من کیستم؟ پایگاه دانش» هستی.
حوزه فعلی: ${domainTitle}
همیشه فارسی حرف بزن. هر بار معمولاً یک سؤال بپرس. بعد از چند تبادل جمع‌بندی کن.`

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role,
          content: String(m.content || '').slice(0, 4000),
        })),
    ]

    const resp = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1200,
      }),
    })

    const text = await resp.text()
    if (!resp.ok) {
      return NextResponse.json(
        { success: false, error: 'خطا از DeepSeek', details: text },
        { status: 502 }
      )
    }

    const data = JSON.parse(text)
    const content = data?.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.'

    return NextResponse.json({ success: true, content })
  } catch {
    return NextResponse.json(
      { success: false, error: 'خطای داخلی سرور' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'deepseek' })
}
