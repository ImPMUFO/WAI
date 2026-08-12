import { NextRequest, NextResponse } from 'next/server'
import { waimaChat } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://waima.vercel.app').replace(/\/$/, '')

function botToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim()
}

async function tg(method: string, body: Record<string, unknown>) {
  const token = botToken()
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing')
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json().catch(() => ({}))
}

async function sendMessage(chatId: number | string, text: string) {
  const clean = (text || '').trim() || '…'
  let rest = clean
  while (rest.length > 0) {
    const part = rest.slice(0, 4000)
    rest = rest.slice(4000)
    const data = await tg('sendMessage', {
      chat_id: chatId,
      text: part,
      disable_web_page_preview: true,
    })
    if (data?.ok === false) console.error('sendMessage fail', data)
  }
}

const SYSTEM = [
  'تو WAIMA هستی — همراه یادگیری در تلگرام.',
  'جواب خودمونی و کامل؛ نه خیلی کوتاه نه خیلی بلند. جمله را نصفه نگذار.',
  'زبان = زبان کاربر. فارسی → فارسی کامل.',
  'یک سؤال کوتاه در پایان بپرس.',
  'خودت را مدل معرفی نکن.',
  `سایت کامل: ${SITE}`,
].join('\n')

export async function POST(req: NextRequest) {
  try {
    if (!botToken()) {
      return NextResponse.json({ ok: false, error: 'no token' }, { status: 500 })
    }

    const update = await req.json().catch(() => null)
    const message = update?.message || update?.edited_message
    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true, skipped: true })
    }
    if (message.from?.is_bot) {
      return NextResponse.json({ ok: true, skipped: 'bot' })
    }

    const chatId = message.chat.id
    const text = String(message.text || message.caption || '').trim()

    if (!text) {
      await sendMessage(chatId, `فعلاً فقط متن پشتیبانی می‌شود.\nسایت: ${SITE}`)
      return NextResponse.json({ ok: true })
    }

    if (text.startsWith('/start')) {
      await sendMessage(
        chatId,
        `سلام! من WAIMA هستم 🧠\n\nهر سؤالی داری همین‌جا بنویس.\nسایت کامل (نقشه و بازی):\n${SITE}`
      )
      return NextResponse.json({ ok: true })
    }
    if (text.startsWith('/site') || text.startsWith('/web')) {
      await sendMessage(chatId, `سایت WAIMA:\n${SITE}`)
      return NextResponse.json({ ok: true })
    }
    if (text.startsWith('/help')) {
      await sendMessage(
        chatId,
        `دستورها:\n/start\n/site\n/help\n\nهر متن دیگر را با هوش مصنوعی جواب می‌دهم.`
      )
      return NextResponse.json({ ok: true })
    }
    if (text.startsWith('/')) {
      await sendMessage(chatId, `دستور ناشناخته. /help را ببین یا سؤال عادی بپرس.`)
      return NextResponse.json({ ok: true })
    }

    try {
      await tg('sendChatAction', { chat_id: chatId, action: 'typing' })
    } catch {
      /* ignore */
    }

    let reply = ''
    try {
      const result = await waimaChat({
        feature: 'chat',
        temperature: 0.7,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: text.slice(0, 4000) },
        ],
      })
      if (result.ok) {
        reply = result.content
      } else {
        console.error('waimaChat fail', result.error)
        reply =
          `الان هوش مصنوعی جواب نداد.\n` +
          `یک‌بار دیگر کوتاه‌تر بپرس.\n` +
          `سایت: ${SITE}\n` +
          `(${String(result.error).slice(0, 120)})`
      }
    } catch (e: unknown) {
      console.error('ai exception', e)
      reply = `خطا در پاسخ‌دهی. دوباره تلاش کن.\n${SITE}`
    }

    await sendMessage(chatId, reply)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('telegram webhook fatal', e)
    return NextResponse.json({ ok: true, error: 'handled' })
  }
}

export async function GET(req: NextRequest) {
  const token = botToken()
  const url = new URL(req.url)
  const setup = url.searchParams.get('setup')
  const secret = url.searchParams.get('secret')
  const setupSecret = (process.env.TELEGRAM_SETUP_SECRET || '').trim()

  if (setup === '1') {
    if (!token) {
      return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN را در Vercel بگذار' }, { status: 500 })
    }
    if (setupSecret && secret !== setupSecret) {
      return NextResponse.json({ ok: false, error: 'secret نادرست' }, { status: 403 })
    }
    const webhookUrl = `${SITE}/api/telegram`
    const data = await tg('setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    })
    const info = await tg('getWebhookInfo', {})
    return NextResponse.json({ ok: true, webhookUrl, setWebhook: data, info })
  }

  if (url.searchParams.get('test') === '1') {
    const q = url.searchParams.get('q') || 'سلام، یک جمله درباره یادگیری بگو'
    const result = await waimaChat({
      feature: 'chat',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: q },
      ],
    })
    return NextResponse.json({ ok: result.ok, result })
  }

  return NextResponse.json({
    ok: true,
    service: 'telegram-waima',
    bot: '@WAIMATGbot',
    hasToken: Boolean(token),
    hasGemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    site: SITE,
    setup: `${SITE}/api/telegram?setup=1`,
    testAi: `${SITE}/api/telegram?test=1&q=سلام`,
  })
}
