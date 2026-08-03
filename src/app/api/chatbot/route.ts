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
    if (!messages?.length) {
      return NextResponse.json({ success: false, error: 'messages الزامی است' }, { status: 400 })
    }

    const domainTitle = domainNames[domain] || domain

    const systemPrompt = `تو «همراه یادگیری» پلتفرم من کیستم؟ هستی؛ صمیمی، دقیق، غیرخسته‌کننده.
حوزه: ${domainTitle}

سبک:
- فارسی روان و انسانی
- پاسخ کوتاه تا متوسط (حدود ۶۰ تا ۱۴۰ کلمه) مگر کاربر صریحاً جزئیات بیشتر بخواهد
- ساختار پیشنهادی وقتی مفید است:
  ۱) یک نکته کلیدی
  ۲) یک مثال ملموس
  ۳) یک سؤال کوتاه برای ادامه فکر
- از لحن خشک کنکوری پرهیز کن
- کتاب را فقط گاهی و در یک خط پیشنهاد بده (نه هر پیام)
- اگر کاربر اشتباه فهمیده، لطیف اصلاح کن و دلیل بگو
- هدف: یادگیری عمیق + انگیزه ادامه گفتگو`

    const recent = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 1500) }))

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...recent],
        temperature: 0.65,
        max_tokens: 380,
      }),
    })

    const text = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: 'خطا از مدل', details: text }, { status: 502 })
    }
    const data = JSON.parse(text)
    const content = data?.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.'
    return NextResponse.json({ success: true, content })
  } catch {
    return NextResponse.json({ success: false, error: 'خطای داخلی سرور' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'chatbot-v3' })
}
