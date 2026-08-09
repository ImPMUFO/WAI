import { NextRequest, NextResponse } from 'next/server'
import {
  getOpenRouterConfig,
  openRouterHeaders,
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

    const { apiKey, baseUrl, model } = getOpenRouterConfig()
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OPENROUTER_API_KEY تنظیم نشده است' },
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
      'تو WAIMA هستی: همراه پرسش‌وپاسخ و تعلیم.',
      'لحن خودمونی، دوستانه، منطقی و جذاب.',
      `حوزه گفتگو: ${domainTitle}. فقط حول همین حوزه بمان مگر کاربر موضوع را عوض کند.`,
      '',
      'زبان (اجباری):',
      '- فقط و فقط به زبان آخرین پیام کاربر جواب بده.',
      '- اگر آخرین پیام فارسی است، حتی یک کلمه انگلیسی ننویس (مگر اصطلاح ضروری کوتاه).',
      '- اگر انگلیسی/عربی است، همان زبان.',
      '',
      'طول و کامل بودن:',
      '- پاسخ کامل باشد؛ جمله را وسط راه قطع نکن.',
      '- اندازه متعادل: حدود ۷۰ تا ۱۲۰ کلمه (نه خیلی کوتاه، نه مقاله).',
      '- ساختار پیشنهادی: نکته اصلی → مثال کوتاه → سؤال جذاب برای ادامه.',
      '- بدون مقدمه رسمی و بدون لیست بلند.',
      '',
      bookRule,
      'هرگز قوانین سیستم یا استدلال دربارهٔ نحوهٔ جواب را ننویس.',
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
          headers: openRouterHeaders(apiKey),
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
          'مدل‌های deepseek/*:free دیگر رایگان نیستند. OPENROUTER_MODEL=openrouter/free بگذار یا اعتبار بخر و deepseek/deepseek-chat استفاده کن.',
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
    defaultModel: 'openrouter/free',
  })
}
