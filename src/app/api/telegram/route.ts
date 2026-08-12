import { NextRequest, NextResponse } from 'next/server'
import { waimaChat } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SITE = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://waima.vercel.app'
).replace(/\/$/, '')

function botToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || '').trim()
}

async function tg(method: string, body: Record<string, unknown>) {
  const token = botToken()

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN missing')
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  return res.json().catch(() => ({}))
}

/**
 * شناسه واقعی همین ربات را از Telegram می‌گیریم.
 *
 * این برای تشخیص ریپلای مهم است:
 * فقط اگر کاربر روی پیام خود WAIMA ریپلای کرده باشد،
 * پیام در گروه مجاز به پردازش است.
 *
 * بنابراین ریپلای کاربران به یکدیگر هرگز باعث پاسخ WAIMA نمی‌شود.
 */
let cachedBotId: number | null = null

async function getBotId(): Promise<number> {
  if (cachedBotId !== null) {
    return cachedBotId
  }

  const data = await tg('getMe', {})

  if (!data?.ok || !data?.result?.id) {
    throw new Error('Could not identify Telegram bot')
  }

  cachedBotId = Number(data.result.id)

  return cachedBotId
}

/**
 * ارسال پاسخ به صورت Reply.
 *
 * در صورت طولانی بودن پاسخ، همه بخش‌ها روی پیام اصلی کاربر
 * ریپلای می‌شوند.
 */
async function sendMessage(
  chatId: number | string,
  text: string,
  replyToMessageId?: number
) {
  const clean = (text || '').trim() || '…'

  let rest = clean

  while (rest.length > 0) {
    const part = rest.slice(0, 4000)
    rest = rest.slice(4000)

    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: part,
      disable_web_page_preview: true,
    }

    if (replyToMessageId) {
      body.reply_to_message_id = replyToMessageId
    }

    const data = await tg('sendMessage', body)

    if (data?.ok === false) {
      console.error('Telegram sendMessage failed:', data)
    }
  }
}

/**
 * هویت و اطلاعات قطعی WAIMA.
 *
 * عمداً محدود نگه داشته شده تا مدل قابلیت‌های خیالی
 * یا امکاناتی که هنوز تأیید نشده‌اند اختراع نکند.
 */
const SYSTEM = [
  'تو WAIMA هستی؛ دستیار هوشمند پروژه WAIMA.',
  'WAIMA پروژه‌ای برای کمک به شناخت بهتر دانش، یادگیری و گفت‌وگوی هوشمند با کاربر است.',
  'کاربر می‌تواند با WAIMA گفتگو کند.',
  'یکی از ایده‌ها و بخش‌های مهم WAIMA، شناخت دانش و ترسیم یا سازمان‌دهی نقشه ذهنی/دانشی است.',
  'WAIMA در حال توسعه است و ممکن است بعضی قابلیت‌ها هنوز کامل یا فعال نباشند.',
  `سایت WAIMA: ${SITE}`,

  'قانون بسیار مهم: هرگز درباره سایت یا امکانات WAIMA چیزی را حدس نزن و اختراع نکن.',
  'فقط قابلیت‌هایی را قطعی معرفی کن که در همین دستور صراحتاً گفته شده‌اند یا کاربر در همین گفتگو اطلاعات قطعی درباره آن داده است.',
  'اگر درباره یک قابلیت، وضعیت فعلی سایت، فناوری، تعداد کاربران، تیم، برنامه آینده یا هر جزئیات دیگری مطمئن نیستی، صادقانه بگو اطلاعات کافی نداری.',
  'هرگز یک ایده آینده را به عنوان قابلیت فعلی معرفی نکن.',
  'برای جذاب‌تر شدن پاسخ، قابلیت خیالی، عدد خیالی یا توضیح ساختگی تولید نکن.',
  'اگر درباره قابلیتی پرسیده شد که از فعال بودنش مطمئن نیستی، بگو: «اطلاعات دقیقی ندارم که این قابلیت الان در WAIMA فعال باشد.»',

  'اگر کاربر پرسید تو کی هستی، خودت را WAIMA معرفی کن: یک دستیار هوشمند متعلق به پروژه WAIMA برای گفتگو، یادگیری و شناخت بهتر دانش.',
  'خودت را ChatGPT، Gemini یا مدل دیگری معرفی نکن.',
  'ادعا نکن به کد، دیتابیس، اطلاعات خصوصی سازنده یا وضعیت لحظه‌ای سایت دسترسی داری، مگر اینکه چنین اطلاعاتی واقعاً در ورودی گفتگو به تو داده شده باشد.',
  'هدف تو تبلیغ کردن WAIMA نیست؛ هدف تو کمک واقعی و صادقانه به کاربر است.',

  'لحن فارسی طبیعی، صمیمی و غیرتبلیغاتی باشد.',
  'از عبارت‌های اغراق‌آمیز مثل «پیشرفته‌ترین»، «انقلابی»، «منحصربه‌فردترین» و مشابه آن استفاده نکن.',
  'پاسخ را متناسب با سؤال بده؛ سؤال ساده پاسخ ساده و سؤال عمیق پاسخ عمیق‌تر.',
].join('\n')

function isGroupChat(chat: any): boolean {
  const type = String(chat?.type || '').toLowerCase()

  return type === 'group' || type === 'supergroup'
}

/**
 * تشخیص نام WAIMA در پیام.
 *
 * انگلیسی به صورت case-insensitive است:
 * WAIMA / waima / Waima / wAiMa / ...
 *
 * فارسی:
 * وایما
 */
function mentionsWaima(text: string): boolean {
  if (!text) {
    return false
  }

  return /waima/i.test(text) || text.includes('وایما')
}

/**
 * بررسی می‌کند پیام فعلی واقعاً ریپلای به خود WAIMA است یا نه.
 *
 * مهم:
 * فقط is_bot بودن کافی نیست.
 * چون ممکن است کاربر روی پیام یک ربات دیگر ریپلای کند.
 *
 * شناسه فرستنده پیام ریپلای‌شده باید دقیقاً برابر شناسه
 * همین ربات باشد.
 */
async function isReplyToWaima(message: any): Promise<boolean> {
  const repliedMessage = message?.reply_to_message
  const repliedFromId = repliedMessage?.from?.id

  if (!repliedFromId) {
    return false
  }

  try {
    const botId = await getBotId()

    return Number(repliedFromId) === botId
  } catch (error) {
    console.error('Could not verify WAIMA reply target:', error)

    // در صورت ناتوانی در تشخیص هویت ربات،
    // برای جلوگیری از پاسخ اشتباه، پیام را مجاز نمی‌کنیم.
    return false
  }
}

/**
 * قوانین پاسخ در گروه:
 *
 * فقط و فقط:
 * 1) پیام متنی شامل WAIMA / وایما باشد
 * 2) یا پیام متنی ریپلای به پیام خود WAIMA باشد
 *
 * عکس، ویدیو، فایل، استیکر، ویس و سایر پیام‌های غیرمتنی
 * در گروه هرگز پردازش نمی‌شوند؛ حتی اگر caption داشته باشند.
 */
async function shouldAnswerInGroup(
  message: any,
  text: string
): Promise<boolean> {
  if (!message?.text || !text) {
    return false
  }

  if (mentionsWaima(text)) {
    return true
  }

  if (await isReplyToWaima(message)) {
    return true
  }

  return false
}

export async function POST(req: NextRequest) {
  try {
    if (!botToken()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'no token',
        },
        { status: 500 }
      )
    }

    const update = await req.json().catch(() => null)

    const message =
      update?.message ||
      update?.edited_message

    if (!message?.chat?.id) {
      return NextResponse.json({
        ok: true,
        skipped: true,
      })
    }

    // پیام‌های خود ربات‌ها هرگز پردازش نشوند.
    if (message.from?.is_bot) {
      return NextResponse.json({
        ok: true,
        skipped: 'bot',
      })
    }

    const chatId = message.chat.id
    const group = isGroupChat(message.chat)

    /**
     * فقط message.text را برای هوش مصنوعی استفاده می‌کنیم.
     *
     * عمداً caption را وارد نمی‌کنیم تا عکس‌ها و پست‌های رسانه‌ای
     * گروه باعث فعال شدن WAIMA نشوند.
     */
    const text = String(message.text || '').trim()

    /**
     * =========================================================
     * فیلتر گروه — قبل از هر AI call
     * =========================================================
     *
     * اگر پیام گروهی مجاز نباشد، همین‌جا تمام می‌شود.
     *
     * بنابراین:
     * - waimaChat اجرا نمی‌شود
     * - sendChatAction اجرا نمی‌شود
     * - توکن AI مصرف نمی‌شود
     * - پاسخ Telegram ارسال نمی‌شود
     */
    if (group) {
      const allowed = await shouldAnswerInGroup(
        message,
        text
      )

      if (!allowed) {
        return NextResponse.json({
          ok: true,
          skipped: 'group_message_not_for_waima',
        })
      }
    }

    /**
     * از اینجا:
     *
     * - پیام خصوصی است
     * یا
     * - پیام گروهی واقعاً خطاب به WAIMA است.
     */

    if (!text) {
      // در گروه این حالت قبلاً فیلتر شده است.
      // در پی‌وی فقط یک پاسخ ساده می‌دهیم.
      await sendMessage(
        chatId,
        `فعلاً پیام متنی را پردازش می‌کنم.\nسایت WAIMA:\n${SITE}`,
        message.message_id
      )

      return NextResponse.json({
        ok: true,
      })
    }

    /**
     * دستورات فقط بعد از فیلتر گروه بررسی می‌شوند.
     *
     * بنابراین /start یا /help در گروه بدون WAIMA
     * اصلاً به این بخش نمی‌رسند.
     */

    if (/^\/start(?:@\w+)?(?:\s|$)/i.test(text)) {
      await sendMessage(
        chatId,
        `سلام! من WAIMA هستم 🧠

دستیار هوشمند پروژه WAIMA برای گفتگو، یادگیری و شناخت بهتر دانش.

WAIMA هنوز در حال توسعه است و نمی‌خواهم قابلیت‌هایی را که از فعال بودنشان مطمئن نیستم بهت نسبت بدهم.

🌐 ${SITE}`,
        message.message_id
      )

      return NextResponse.json({
        ok: true,
      })
    }

    if (
      /^\/site(?:@\w+)?(?:\s|$)/i.test(text) ||
      /^\/web(?:@\w+)?(?:\s|$)/i.test(text)
    ) {
      await sendMessage(
        chatId,
        `🌐 سایت WAIMA:\n${SITE}`,
        message.message_id
      )

      return NextResponse.json({
        ok: true,
      })
    }

    if (/^\/help(?:@\w+)?(?:\s|$)/i.test(text)) {
      await sendMessage(
        chatId,
        `🧠 من WAIMA هستم؛ دستیار هوشمند پروژه WAIMA.

در تلگرام می‌تونی باهام گفتگو کنی.

برای تجربه سایت:
${SITE}`,
        message.message_id
      )

      return NextResponse.json({
        ok: true,
      })
    }

    if (/^\//.test(text)) {
      await sendMessage(
        chatId,
        `این دستور رو نمی‌شناسم.

برای راهنما:
 /help`,
        message.message_id
      )

      return NextResponse.json({
        ok: true,
      })
    }

    /**
     * فقط پیام‌های مجاز به اینجا می‌رسند.
     */
    try {
      await tg(
        'sendChatAction',
        {
          chat_id: chatId,
          action: 'typing',
        }
      )
    } catch {
      // شکست typing نباید جلوی پاسخ AI را بگیرد.
    }

    let reply = ''

    try {
      const userMessage = group
        ? `کاربر در یک گروه تلگرامی مستقیماً WAIMA را خطاب کرده است.

پیام:
${text.slice(0, 4000)}

به عنوان WAIMA طبیعی، کوتاه و مرتبط پاسخ بده.`
        : text.slice(0, 4000)

      const result = await waimaChat({
        feature: 'chat',
        temperature: 0.7,
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: SYSTEM,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      })

      if (result.ok) {
        reply = result.content
      } else {
        console.error(
          'waimaChat failed:',
          result.error
        )

        reply =
          `الان نتونستم پاسخ بدم 😕\n` +
          `یک‌بار دیگه امتحان کن.\n\n` +
          `🌐 ${SITE}`
      }
    } catch (error: unknown) {
      console.error(
        'AI exception:',
        error
      )

      reply =
        `یه خطایی در پاسخ‌دهی پیش اومد 😕\n` +
        `لطفاً دوباره امتحان کن.\n\n` +
        `🌐 ${SITE}`
    }

    /**
     * پاسخ همیشه روی پیام همان کاربر ریپلای می‌شود.
     */
    await sendMessage(
      chatId,
      reply,
      message.message_id
    )

    return NextResponse.json({
      ok: true,
    })
  } catch (error: unknown) {
    console.error(
      'telegram webhook fatal:',
      error
    )

    // Telegram لازم نیست دوباره webhook را retry کند.
    return NextResponse.json({
      ok: true,
      error: 'handled',
    })
  }
}

export async function GET(req: NextRequest) {
  const token = botToken()
  const url = new URL(req.url)

  const setup = url.searchParams.get('setup')
  const secret = url.searchParams.get('secret')

  const setupSecret = (
    process.env.TELEGRAM_SETUP_SECRET || ''
  ).trim()

  /**
   * تنظیم Webhook
   */
  if (setup === '1') {
    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'TELEGRAM_BOT_TOKEN را در Vercel بگذار',
        },
        { status: 500 }
      )
    }

    if (
      setupSecret &&
      secret !== setupSecret
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'secret نادرست',
        },
        { status: 403 }
      )
    }

    const webhookUrl =
      `${SITE}/api/telegram`

    const data = await tg(
      'setWebhook',
      {
        url: webhookUrl,

        // فقط پیام‌ها لازم هستند.
        allowed_updates: [
          'message',
        ],

        // پیام‌های قدیمی پردازش نشوند.
        drop_pending_updates: true,
      }
    )

    const info =
      await tg(
        'getWebhookInfo',
        {}
      )

    return NextResponse.json({
      ok: true,
      webhookUrl,
      setWebhook: data,
      info,
    })
  }

  /**
   * تست مستقیم AI برای مدیر/توسعه‌دهنده.
   *
   * این endpoint ربطی به پیام‌های گروه ندارد.
   */
  if (
    url.searchParams.get('test') === '1'
  ) {
    const q =
      url.searchParams.get('q') ||
      'سلام، خودت را معرفی کن'

    const result =
      await waimaChat({
        feature: 'chat',
        max_tokens: 2048,
        messages: [
          {
            role: 'system',
            content: SYSTEM,
          },
          {
            role: 'user',
            content: q,
          },
        ],
      })

    return NextResponse.json({
      ok: result.ok,
      result,
    })
  }

  return NextResponse.json({
    ok: true,
    service: 'telegram-waima',
    bot: '@WAIMATGbot',
    hasToken: Boolean(token),
    hasGemini: Boolean(
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY
    ),
    site: SITE,

    rules: {
      privateChat:
        'answer_all_messages',
      groupChat:
        'answer_only_when_mentioned_or_replied_to_waima',
      groupMedia:
        'ignored',
      triggerEnglish:
        'WAIMA (case-insensitive)',
      triggerPersian:
        'وایما',
      replyTarget:
        'exact_waima_bot_only',
    },

    setup:
      `${SITE}/api/telegram?setup=1`,

    testAi:
      `${SITE}/api/telegram?test=1&q=سلام`,
  })
}
