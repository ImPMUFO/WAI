import { NextRequest, NextResponse } from 'next/server'
import { getOpenRouterConfig, openRouterHeaders } from '@/lib/ai'

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

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...recent],
        temperature: 0.7,
        max_tokens: suggestBook ? 520 : 400,
      }),
    })

    const textBody = await resp.text()
    if (!resp.ok) {
      return NextResponse.json({ success: false, error: 'model error', details: textBody }, { status: 502 })
    }
    const data = JSON.parse(textBody)
    const content = data?.choices?.[0]?.message?.content || 'No response.'
    return NextResponse.json({ success: true, content, suggestBook })
  } catch {
    return NextResponse.json({ success: false, error: 'server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', api: 'chatbot-lang' })
}
