import { NextRequest, NextResponse } from 'next/server'
import {
  getOpenRouterConfig,
  openRouterHeaders,
  extractMessageText,
  modelsToAttempt,
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
      ? 'If appropriate, suggest ONE relevant book with a short reason.'
      : lastBook
        ? `You already suggested: ${JSON.stringify(lastBook)}. Avoid repeating the same book.`
        : ''

    const systemPrompt = [
      'You are WAIMA, a warm learning companion (Who am I? / Mind Mapper).',
      'Be warm, precise, and concise.',
      `Domain focus: ${domainTitle}`,
      memory,
      '',
      'LANGUAGE RULE (mandatory):',
      "- Reply in the SAME language as the user's latest message.",
      '- If the user writes in English, answer in English.',
      '- If Arabic, answer in Arabic.',
      '- If Persian/Farsi, answer in Persian.',
      '- If they mix languages, follow the main language of their last message.',
      '- Never force Persian when the user is not writing in Persian.',
      '',
      'Style:',
      '- Short to medium answers (about 60-140 words) unless they ask for more',
      '- When useful: one key point + one example + one short question',
      '- Do not deny things you already said in this chat',
      bookRule,
    ]
      .filter(Boolean)
      .join('\n')

    const recent = messages
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: String(m.content || '').slice(0, 1800) }))

    const payloadBase = {
      messages: [{ role: 'system', content: systemPrompt }, ...recent],
      temperature: 0.7,
      max_tokens: suggestBook ? 700 : 500,
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
        const content = extractMessageText(data?.choices?.[0]?.message)
        if (!content) {
          lastError = 'empty content from ' + tryModel
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
