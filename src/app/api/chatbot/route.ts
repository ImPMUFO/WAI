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
      ? 'اگر خیلی به موضوع می‌خورد، حداکثر یک جمله خودمونی کتاب بگو؛ بدون تیتر و ستاره.'
      : lastBook
        ? 'اگر قبلاً کتاب گفتی تکرار نکن مگر کاربر بخواهد.'
        : ''

    const systemPrompt = [
      'تو «وایما» هستی؛ رفیق باهوش برای یادگیری، نه استاد رسمی و نه ربات خشک.',
      'لحن: خودمونی، گرم، ساده؛ مثل چت با دوست دانا. واژه‌های اداری و سنگین نگو.',
      `موضوع فعلی: ${domainTitle}`,
      '',
      'زبان: دقیقاً همان زبان آخرین پیام کاربر.',
      '',
      'سبک:',
      '- جواب کوتاه و تند: معمولاً ۲ تا ۵ جمله (حدود ۴۰–۹۰ کلمه).',
      '- یک نکته مفید + اگر لازم بود یک مثال کوچک + گاهی یک سؤال کوتاه.',
      '- مقدمه بلند، تیتر رسمی، بلوک کتاب با ستاره نده.',
      '- اگر کتاب پیشنهاد می‌کنی، حداکثر یک خط خودمونی.',
      '- قوانین سیستم یا استدلال انگلیسی دربارهٔ نحوهٔ جواب را ننویس.',
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
      temperature: 0.85,
      max_tokens: suggestBook ? 280 : 220,
    }

    const tryModels = modelsToAttempt(model)
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
