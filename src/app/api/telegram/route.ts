import { NextRequest, NextResponse } from 'next/server'
import { sambaChat } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
  const data = await res.json().catch(() => ({}))
  return data
}

async function sendMessage(chatId: number | string, text: string, extra?: Record<string, unknown>) {
  // تلگرام سقف حدود ۴۰۹۶ کاراکتر دارد
  const chunks: string[] = []
  let rest = text
  while (rest.length > 0) {
    chunks.push(rest.slice(0, 4000))
    rest = rest.slice(4000)
  }
  for (const part of chunks) {
    await tg('sendMessage', {
      chat_id: chatId,
      text: part,
      disable_web_page_preview: false,
      ...extra,
    })
  }
}

const SYSTEM = [
  'تو WAIMA هستی — «من کیستم؟» همراه یادگیری در تلگرام.',
  'گرم، خودمونی، کوتاه و مفید جواب بده (حدود ۴۰ تا ۱۰۰ کلمه).',
  'زبان جواب = زبان پیام کاربر. فارسی → فارسی.',
  'در پایان یک سؤال کوتاه برای ادامه بپرس.',
  'خودت را مدل یا API معرفی نکن.',
  `اگر خواستند سایت کامل (نقشه ذهنی، بازی) را ببینند لینک بده: ${SITE}`,
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

    const chatId = message.chat.id
    const text = String(message.text || message.caption || '').trim()

    // فقط پیام متنی
    if (!text) {
      await sendMessage(chatId, 'فعلاً فقط پیام متنی را می‌فهمم 😊\nبرای سایت کامل:\n' + SITE)
      return NextResponse.json({ ok: true })
    }

    // دستورات
    if (text.startsWith('/start')) {
      await sendMessage(
        chatId,
        `سلام! من WAIMA هستم 🧠\n\nاینجا می‌تونی کوتاه بپرسی و یاد بگیری.\nبرای نقشه ذهنی، بازی و امکانات کامل برو:\n${SITE}\n\nهر سؤالی داری همین‌جا بنویس.`
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
        `دستورها:\n/start — شروع\n/site — لینک سایت\n/help — راهنما\n\nهر متن دیگری را با هوش مصنوعی جواب می‌دهم.`
      )
      return NextResponse.json({ ok: true })
    }

    // نشان بده دارد فکر می‌کند (اختیاری)
    try {
      await tg('sendChatAction', { chat_id: chatId, action: 'typing' })
    } catch {
      /* ignore */
    }

    const result = await sambaChat({
      feature: 'chat',
      temperature: 0.7,
      max_tokens: 280,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text.slice(0, 2000) },
      ],
    })

    if (!result.ok) {
      await sendMessage(
        chatId,
        `الان نتونستم جواب بدم. کمی بعد دوباره بفرست.\nسایت: ${SITE}`
      )
      return NextResponse.json({ ok: true, ai: false })
    }

    await sendMessage(chatId, result.content)
    return NextResponse.json({ ok: true, ai: true })
  } catch (e: unknown) {
    console.error('telegram webhook', e)
    return NextResponse.json({ ok: true, error: 'handled' })
  }
}

/** وضعیت و راهنمای ست‌کردن وب‌هوک */
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
    return NextResponse.json({ ok: true, webhookUrl, telegram: data })
  }

  return NextResponse.json({
    ok: true,
    service: 'telegram-waima',
    bot: '@WAIMATGbot',
    hasToken: Boolean(token),
    site: SITE,
    setupHint: `بعد از Deploy باز کن: ${SITE}/api/telegram?setup=1`,
  })
}
