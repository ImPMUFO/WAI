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

async function sendMessage(
  chatId: number | string,
  text: string
) {
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

    if (data?.ok === false) {
      console.error('Telegram sendMessage failed:', data)
    }
  }
}

/**
 * هویت اصلی WAIMA
 *
 * این متن به مدل می‌گوید WAIMA دقیقاً چیست،
 * چه هدفی دارد و در تلگرام چه نقشی دارد.
 */
const SYSTEM = `
تو WAIMA هستی.

هویت:
نام تو «WAIMA» یا «وایما» است.
WAIMA یک همراه هوشمند برای شناخت، یادگیری و رشد فکری انسان است؛
نه صرفاً یک ربات سؤال‌وجواب.

هدف اصلی WAIMA:
کمک به کاربر برای شناخت بهتر دانش، افکار و توانایی‌های خودش،
یادگیری عمیق‌تر و پیدا کردن مسیر مناسب برای رشد.

WAIMA در سایت خودش امکانات گسترده‌تری دارد، از جمله:
- گفت‌وگوی هوشمند و تعاملی
- ارزیابی سطح و عمق دانش کاربر
- کشف نقاط قوت و ضعف دانشی
- ترسیم و ساخت نقشه ذهنی و نقشه دانش
- کمک به سازمان‌دهی دانسته‌ها و ارتباط بین مفاهیم
- بازی‌ها و فعالیت‌های فکری و آموزشی
- تجربه‌های تعاملی برای یادگیری و شناخت بهتر خود
- کمک به رشد تدریجی دانش و تفکر کاربر

سایت رسمی WAIMA:
${SITE}

نقش تو در تلگرام:
تو نماینده و همراه تلگرامی WAIMA هستی.
در تلگرام باید مانند خود WAIMA رفتار کنی، نه مانند یک ربات عمومی بی‌هویت.

اگر کاربر پرسید «تو کی هستی؟» یا «WAIMA چیه؟»،
خودت را واضح معرفی کن:
«من WAIMA هستم؛ یک همراه هوشمند برای شناخت، یادگیری و رشد فکری. در سایت WAIMA می‌توانی علاوه بر گفتگو، دانش و ذهنت را بهتر بشناسی، نقشه ذهنی/دانشی بسازی و از بازی‌ها و فعالیت‌های تعاملی استفاده کنی.»

اگر کاربر درباره امکانات بیشتر، نقشه ذهنی، بازی‌ها، ارزیابی دانش یا تجربه کامل WAIMA پرسید،
او را به سایت هدایت کن:
${SITE}

نحوه گفتگو:
- طبیعی، صمیمی و انسانی صحبت کن.
- پاسخ‌ها خشک و رباتیک نباشند.
- اگر کاربر فارسی صحبت می‌کند، فارسی روان و طبیعی جواب بده.
- اگر انگلیسی صحبت می‌کند، انگلیسی پاسخ بده.
- خودت را «ChatGPT»، «GPT»، «مدل زبانی» یا هوش مصنوعی دیگری معرفی نکن؛
  تو WAIMA هستی.
- ادعا نکن که چیزی را در سایت انجام داده‌ای مگر واقعاً از امکانات موجود مطمئن باشی.
- پاسخ را متناسب با سؤال کاربر بده؛ همیشه لازم نیست طولانی باشی.
- در صورت مناسب بودن، گفتگو را با یک سؤال یا پیشنهاد ادامه بده.
- هدف، ایجاد یک گفتگوی واقعی و مفید است، نه صرفاً تولید متن.

هویت WAIMA را در تمام گفتگو حفظ کن.
`

/**
 * تشخیص می‌دهد چت گروهی است یا خصوصی.
 */
function isGroupChat(chat: any): boolean {
  const type = String(chat?.type || '').toLowerCase()

  return (
    type === 'group' ||
    type === 'supergroup'
  )
}

/**
 * آیا پیام شامل WAIMA / وایما است؟
 *
 * WAIMA با هر ترکیبی از حروف بزرگ و کوچک قبول می‌شود:
 * WAIMA
 * Waima
 * waima
 * wAiMa
 *
 * و همچنین:
 * وایما
 */
function mentionsWaima(text: string): boolean {
  if (!text) return false

  const normalized = text.trim()

  // انگلیسی: case-insensitive
  if (/waima/i.test(normalized)) {
    return true
  }

  // فارسی
  if (normalized.includes('وایما')) {
    return true
  }

  return false
}

/**
 * آیا پیام، ریپلای به پیامی از خود WAIMA است؟
 */
function isReplyToWaima(
  message: any
): boolean {
  const reply = message?.reply_to_message

  if (!reply) {
    return false
  }

  // اگر Telegram شناسه کاربر/بات را داشته باشد
  if (
    reply?.from?.is_bot === true
  ) {
    return true
  }

  // حالت جایگزین:
  // اگر username بات در پیام ریپلای شده باشد
  const username = String(
    reply?.from?.username || ''
  ).toLowerCase()

  if (
    username === 'waimatgbot' ||
    username === 'waima_bot'
  ) {
    return true
  }

  return false
}

/**
 * قوانین پاسخ‌دهی WAIMA در گروه
 *
 * بسیار مهم:
 * این تابع قبل از هر درخواست AI اجرا می‌شود.
 *
 * بنابراین پیام‌های غیرمجاز:
 * - waimaChat نمی‌گیرند
 * - typing نمی‌گیرند
 * - پاسخ نمی‌گیرند
 * - توکن AI مصرف نمی‌کنند
 */
function shouldAnswerInGroup(
  message: any,
  text: string
): boolean {
  // اگر WAIMA در پیام صدا زده شده
  if (mentionsWaima(text)) {
    return true
  }

  // اگر کاربر روی پیام WAIMA ریپلای کرده
  if (isReplyToWaima(message)) {
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

    // پیام‌های خود ربات‌ها هرگز پردازش نشوند
    if (message.from?.is_bot) {
      return NextResponse.json({
        ok: true,
        skipped: 'bot',
      })
    }

    const chatId = message.chat.id

    const text = String(
      message.text ||
      message.caption ||
      ''
    ).trim()

    const group = isGroupChat(message.chat)

    /**
     * =====================================================
     * مهم‌ترین بخش:
     * فیلتر گروه باید قبل از هر پردازش دیگری انجام شود.
     * =====================================================
     *
     * در گروه فقط این دو حالت مجازند:
     *
     * 1. پیام شامل WAIMA / وایما باشد
     * 2. پیام ریپلای به پیام WAIMA باشد
     *
     * در غیر این صورت بلافاصله خارج می‌شویم.
     *
     * هیچ AI call انجام نمی‌شود.
     */
    if (group) {
      const allowed = shouldAnswerInGroup(
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
     * از اینجا به بعد:
     *
     * - پیام خصوصی است
     * یا
     * - پیام گروهی مجاز است.
     */

    if (!text) {
      await sendMessage(
        chatId,
        `فعلاً فقط پیام‌های متنی را پردازش می‌کنم.\n\nسایت WAIMA:\n${SITE}`
      )

      return NextResponse.json({
        ok: true,
      })
    }

    /**
     * دستورات تلگرام
     *
     * در گروه فقط زمانی به این قسمت می‌رسیم
     * که پیام شامل WAIMA باشد یا ریپلای به WAIMA باشد.
     */
    if (/^\/start(?:@\w+)?(?:\s|$)/i.test(text)) {
      await sendMessage(
        chatId,
        `سلام! من WAIMA هستم 🧠

یک همراه هوشمند برای شناخت، یادگیری و رشد فکری.

در WAIMA فقط قرار نیست سؤال بپرسی و جواب بگیری؛
هدف اینه که با گفتگو، ارزیابی، نقشه‌های ذهنی و دانشی، بازی‌ها و فعالیت‌های تعاملی، بهتر بفهمی چه می‌دانی، چه چیزهایی را نمی‌دانی و چطور می‌توانی رشد کنی.

برای تجربه کامل‌تر:
${SITE}`
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
        `🌐 سایت رسمی WAIMA:\n${SITE}

اونجا می‌تونی تجربه کامل‌تر WAIMA، گفتگو، نقشه‌های ذهنی و دانشی، بازی‌ها و امکانات تعاملی رو ببینی.`
      )

      return NextResponse.json({
        ok: true,
      })
    }

    if (/^\/help(?:@\w+)?(?:\s|$)/i.test(text)) {
      await sendMessage(
        chatId,
        `🧠 راهنمای WAIMA

من WAIMA هستم؛ همراه هوشمند شناخت، یادگیری و رشد فکری.

در تلگرام می‌تونی باهام گفتگو کنی.

در سایت WAIMA امکانات بیشتری مثل:
• نقشه ذهنی و نقشه دانش
• ارزیابی و شناخت دانش
• بازی‌ها و فعالیت‌های فکری
• تجربه‌های تعاملی یادگیری
• و امکانات بیشتر

در دسترسه:

${SITE}`
      )

      return NextResponse.json({
        ok: true,
      })
    }

    /**
     * در گروه، دستور ناشناخته فقط در صورتی به اینجا می‌رسد
     * که WAIMA در پیام صدا زده شده یا پیام ریپلای به WAIMA باشد.
     */
    if (text.startsWith('/')) {
      await sendMessage(
        chatId,
        `این دستور رو نمی‌شناسم.

برای دیدن راهنما:
 /help

🌐 ${SITE}`
      )

      return NextResponse.json({
        ok: true,
      })
    }

    /**
     * فقط از اینجا درخواست AI ارسال می‌شود.
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
      // اگر typing شکست خورد، پاسخ AI همچنان ادامه پیدا کند.
    }

    let reply = ''

    try {
      /**
       * اگر پیام در گروه باشد، بهتر است متن واضح‌تر
       * به مدل داده شود تا بداند کاربر مستقیماً WAIMA را صدا زده.
       */
      const userMessage = group
        ? `کاربر در یک گروه تلگرامی مستقیماً تو را خطاب کرده است.

پیام کاربر:
${text.slice(0, 4000)}

به عنوان WAIMA طبیعی و مرتبط پاسخ بده.`
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
    } catch (e: unknown) {
      console.error(
        'AI exception:',
        e
      )

      reply =
        `یه خطایی در پاسخ‌دهی پیش اومد 😕\n` +
        `لطفاً دوباره امتحان کن.\n\n` +
        `🌐 ${SITE}`
    }

    await sendMessage(
      chatId,
      reply
    )

    return NextResponse.json({
      ok: true,
    })
  } catch (e: unknown) {
    console.error(
      'telegram webhook fatal:',
      e
    )

    return NextResponse.json({
      ok: true,
      error: 'handled',
    })
  }
}

export async function GET(
  req: NextRequest
) {
  const token = botToken()

  const url = new URL(req.url)

  const setup =
    url.searchParams.get('setup')

  const secret =
    url.searchParams.get('secret')

  const setupSecret =
    (
      process.env.TELEGRAM_SETUP_SECRET ||
      ''
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

        /**
         * فقط message لازم داریم.
         */
        allowed_updates: [
          'message',
        ],

        /**
         * پیام‌های قدیمی منتظر پردازش
         * وارد صف جدید نشوند.
         */
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
   * تست مستقیم AI
   *
   * توجه:
   * این endpoint عمداً مستقل از فیلتر گروه است
   * و برای تست مدیر سایت است.
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
        'answer_only_when_mentioned_or_replied_to',
      triggerEnglish:
        'WAIMA (case-insensitive)',
      triggerPersian:
        'وایما',
    },

    setup:
      `${SITE}/api/telegram?setup=1`,

    testAi:
      `${SITE}/api/telegram?test=1&q=سلام`,
  })
}