import { NextRequest, NextResponse } from 'next/server'
import { waimaChat } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 45

const SITE = (process.env.NEXT_PUBLIC_APP_URL || 'https://waima.vercel.app').replace(/\/$/, '')

function botToken() { return (process.env.TELEGRAM_BOT_TOKEN || '').trim() }

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

let cachedBotId: number | null = null
async function getBotId() {
  if (cachedBotId !== null) return cachedBotId
  const data = await tg('getMe', {})
  if (!data?.ok || !data?.result?.id) throw new Error('Could not identify Telegram bot')
  cachedBotId = Number(data.result.id)
  return cachedBotId
}

async function sendMessage(chatId: number | string, text: string, replyToMessageId?: number) {
  let rest = (text || '').trim() || '…'
  while (rest.length) {
    const part = rest.slice(0, 4000)
    rest = rest.slice(4000)
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: part,
      disable_web_page_preview: true,
    }
    if (replyToMessageId) body.reply_to_message_id = replyToMessageId
    await tg('sendMessage', body)
  }
}

const SYSTEM = [
  'تو WAIMA هستی؛ دستیار هوشمند پروژه WAIMA.',
  'کمک واقعی و صادقانه به گفتگو، یادگیری و شناخت بهتر دانش.',
  'هرگز قابلیت، عدد، فناوری یا وضعیت سایت را حدس نزن.',
  'اگر مطمئن نیستی بگو اطلاعات کافی ندارم.',
  'لحن فارسی طبیعی و صمیمی باشد.',
  'پاسخ را متناسب با سؤال و نسبتاً کوتاه نگه دار.',
  `سایت: ${SITE}`,
].join('\n')

function isGroupChat(chat: any) {
  const type = String(chat?.type || '').toLowerCase()
  return type === 'group' || type === 'supergroup'
}

function mentionsWaima(text: string) {
  return /waima/i.test(text) || text.includes('وایما')
}

async function isReplyToWaima(message: any) {
  const repliedFromId = message?.reply_to_message?.from?.id
  if (!repliedFromId) return false
  try { return Number(repliedFromId) === (await getBotId()) } catch { return false }
}

async function shouldAnswerInGroup(message: any, text: string) {
  if (!message?.text || !text) return false
  if (mentionsWaima(text)) return true
  return isReplyToWaima(message)
}

export async function POST(req: NextRequest) {
  try {
    if (!botToken()) return NextResponse.json({ ok: false, error: 'no token' }, { status: 500 })

    const update = await req.json().catch(() => null)
    const message = update?.message || update?.edited_message
    if (!message?.chat?.id) return NextResponse.json({ ok: true, skipped: true })
    if (message.from?.is_bot) return NextResponse.json({ ok: true, skipped: 'bot' })

    const chatId = message.chat.id
    const group = isGroupChat(message.chat)
    const text = String(message.text || '').trim()

    if (group && !(await shouldAnswerInGroup(message, text))) {
      return NextResponse.json({ ok: true, skipped: 'group_message_not_for_waima' })
    }

    if (!text) {
      await sendMessage(chatId, `فعلاً پیام متنی را پردازش می‌کنم.\n${SITE}`, message.message_id)
      return NextResponse.json({ ok: true })
    }

    if (/^\/start(?:@\w+)?(?:\s|$)/i.test(text)) {
      await sendMessage(chatId, `سلام! من WAIMA هستم 🧠\n\nدستیار هوشمند پروژه WAIMA برای گفتگو و یادگیری.\n\n${SITE}`, message.message_id)
      return NextResponse.json({ ok: true })
    }

    if (/^\/(?:site|web)(?:@\w+)?(?:\s|$)/i.test(text)) {
      await sendMessage(chatId, `🌐 سایت WAIMA:\n${SITE}`, message.message_id)
      return NextResponse.json({ ok: true })
    }

    if (/^\/help(?:@\w+)?(?:\s|$)/i.test(text)) {
      await sendMessage(chatId, `🧠 من WAIMA هستم.\n\nدر تلگرام می‌تونی باهام گفتگو کنی.\n${SITE}`, message.message_id)
      return NextResponse.json({ ok: true })
    }

    if (/^\//.test(text)) {
      await sendMessage(chatId, `این دستور رو نمی‌شناسم.\n/help`, message.message_id)
      return NextResponse.json({ ok: true })
    }

    try {
      await tg('sendChatAction', { chat_id: chatId, action: 'typing' })
    } catch {}

    const userMessage = group
      ? `کاربر در گروه مستقیماً WAIMA را خطاب کرده است.\nپیام:\n${text.slice(0, 3000)}\nکوتاه و طبیعی پاسخ بده.`
      : text.slice(0, 3000)

    const result = await waimaChat({
      feature: 'chat',
      temperature: 0.65,
      max_tokens: 1800,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: userMessage }],
    })

    const reply = result.ok
      ? result.content
      : `الان نتونستم پاسخ بدم 😕\nیک‌بار دیگه امتحان کن.\n\n${SITE}`

    await sendMessage(chatId, reply, message.message_id)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('telegram webhook fatal:', error)
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
    if (!token) return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN را در Vercel بگذار' }, { status: 500 })
    if (setupSecret && secret !== setupSecret) return NextResponse.json({ ok: false, error: 'secret نادرست' }, { status: 403 })

    const data = await tg('setWebhook', { url: `${SITE}/api/telegram` })
    return NextResponse.json(data)
  }

  const data = await tg('getWebhookInfo', {})
  return NextResponse.json(data)
}
