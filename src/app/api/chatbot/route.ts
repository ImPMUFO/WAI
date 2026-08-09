import { NextRequest, NextResponse } from 'next/server'
import { getOpenRouterConfig, openRouterHeaders, extractMessageText } from '@/lib/ai'

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
    const { apiKey, baseUrl, model } = getOpenRouterConfig()
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'OPENROUTER_API_KEY تنظیم نشده است' }, { status: 500 })
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

    const memory = lastBook?.title
      ? [
          'Memory: you already recommended this book in this chat:',
          `- title: ${lastBook.title}`,
          `- author: ${lastBook.author || 'unknown'}`,
          `- reason: ${lastBook.reason || '-'}`,
          'If the user asks about that book, acknowledge it. Do not deny it.',
        ].join('\n')
      : ''

    const bookRule = suggestBook
      ? [
          'Now suggest ONE book relevant to this conversation.',
          'Make it practical and interesting, matching the user level.',
          'Write the book block in the SAME language as the user.',
          'End with exactly 3 lines using labels in the user language, or:',
          'Book: <title>',
          'Author: <author>',
          'Why: <short reason>',
          'Persian labels also OK: کتاب پیشنهادی / نویسنده / چرا این کتاب',
        ].join('\n')
      : [
          'Do not suggest a new book unless the user asks for one.',
          'If they ask about a previous book recommendation, use the memory above.',
        ].join('\n')

    const systemPrompt = [
      'You are the learning companion of WAIMA (Who am I? / Mind Mapper).',
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
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 1800) }))

    const payload = {
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...recent],
      temperature: 0.7,
      max_tokens: suggestBook ? 700 : 500,
    }

    let lastError = ''
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: openRouterHeaders(apiKey),
          body: JSON.stringify(payload),
        })
        const textBody = await resp.text()
        if (!resp.ok) {
          lastError = textBody.slice(0, 400)
          // 429 یا خطای موقت → یک‌بار دیگر
          if (resp.status === 429 || resp.status >= 500) {
            await new Promise((r) => setTimeout(r, 800))
            continue
          }
          return NextResponse.json(
            { success: false, error: 'model error', details: lastError, model },
            { status: 502 }
          )
        }
        let data: any
        try {
          data = JSON.parse(textBody)
        } catch {
          lastError = 'invalid json'
          continue
        }
        const content = extractMessageText(data?.choices?.[0]?.message)
        if (!content) {
          lastError = 'empty content'
          continue
        }
        return NextResponse.json({
          success: true,
          content,
          suggestBook,
          model: data?.model || model,
        })
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : 'network'
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'model error',
        details: lastError || 'unknown',
        model,
        hint:
          'کلید OPENROUTER_API_KEY و مدل deepseek/deepseek-v4-flash:free را در Vercel بررسی کن. سقف روزانه رایگان OpenRouter هم ممکن است پر شده باشد.',
      },
      { status: 502 }
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
  return NextResponse.json({ status: 'ok', api: 'chatbot-lang' })
}
