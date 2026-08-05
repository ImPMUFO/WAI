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
    const suggestBook = Boolean(body?.suggestBook)
    const lastBook = body?.lastBook as { title?: string; author?: string; reason?: string } | null

    if (!messages?.length) {
      return NextResponse.json({ success: false, error: 'messages الزامی است' }, { status: 400 })
    }

    const domainTitle = domainNames[domain] || domain

    const memory =
      lastBook?.title
        ? `
یادآوری مهم: در همین گفتگو قبلاً این کتاب را پیشنهاد داده‌ای:
- عنوان: ${lastBook.title}
- نویسنده: ${lastBook.author || 'نامشخص'}
- دلیل: ${lastBook.reason || '—'}
اگر کاربر درباره «کتابی که گفتی» یا «چرا این کتاب» پرسید، دقیقاً به همین پیشنهاد اشاره کن و انکار نکن.
`
        : ''

    const bookRule = suggestBook
      ? `
الان وقت پیشنهاد یک کتاب جدید است.
قوانین کتاب:
- متنوع، جذاب، کاربردی و مرتبط با همین گفتگو باشد
- از کتاب‌های کلیشه‌ای تکراری بی‌ربط پرهیز کن
- سطحش با سطح کاربر در این مکالمه بخواند
- ترجیحاً کتاب واقعی و شناخته‌شده
در پایان پاسخ دقیقا این ۳ خط را بنویس:
کتاب پیشنهادی: <نام کتاب>
نویسنده: <نام نویسنده>
چرا این کتاب: <دلیل کوتاه و مشخص مرتبط با همین گفتگو>
      : `
کتاب جدید پیشنهاد نده مگر کاربر صریحاً کتاب بخواهد.
اگر درباره کتاب قبلی پرسید، از یادآوری بالا استفاده کن.
`

    const systemPrompt = `تو «همراه یادگیری» پلتفرم WAIMA (من کیستم؟ · ترسیم‌گر ذهنی) هستی.
صمیمی، دقیق، باحافظه نسبت به پیشنهادهای خودت.
حوزه: ${domainTitle}
${memory}

سبک:
- فارسی روان
- پاسخ کوتاه تا متوسط (۶۰ تا ۱۴۰ کلمه) مگر کاربر جزئیات بخواهد
- نکته + مثال + سؤال کوتاه وقتی مفید است
- انکار نکن چیزی را که خودت در همین گفتگو گفته‌ای
${bookRule}`

    const recent = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 1800) }))

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...recent],
        temperature: 0.7,
        max_tokens: suggestBook ? 520 : 400,
      }),
    })

    const text = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: 'خطا از مدل', details: text }, { status: 502 })
    }
    const data = JSON.parse(text)
    const content = data?.choices?.[0]?.message?.content || 'پاسخی دریافت نشد.'
    return NextResponse.json({ success: true, content, suggestBook })
  } catch {
    return NextResponse.json({ success: false, error: 'خطای داخلی سرور' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'chatbot-book-memory' })
}
