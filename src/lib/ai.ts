/**
 * تنظیمات OpenRouter برای WAIMA
 *
 * Vercel env:
 *   OPENROUTER_API_KEY  (الزامی)
 *   OPENROUTER_MODEL    (اختیاری)
 *
 * پیش‌فرض رایگان: deepseek/deepseek-chat:free
 * (نسخه free مربوط به V4 Flash دیگر در OpenRouter موجود نیست)
 *
 * گزینه‌های دیگر:
 *   deepseek/deepseek-v4-flash     → پولی، کیفیت بالاتر
 *   deepseek/deepseek-v4-pro      → پولی، قوی‌ترین
 *   openrouter/free               → مسیریاب مدل‌های رایگان
 *

/** متن پاسخ مدل‌های مختلف OpenRouter (content رشته / آرایه / reasoning) */
export function extractMessageText(message: any): string {
  if (!message) return ''
  const c = message.content
  if (typeof c === 'string' && c.trim()) return c.trim()
  if (Array.isArray(c)) {
    const joined = c
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part.text === 'string') return part.text
        if (part && typeof part.content === 'string') return part.content
        return ''
      })
      .join('')
      .trim()
    if (joined) return joined
  }
  if (typeof message.reasoning === 'string' && message.reasoning.trim()) {
    // برخی مدل‌های reasoning فقط reasoning می‌دهند
    return message.reasoning.trim()
  }
  if (typeof message.text === 'string' && message.text.trim()) return message.text.trim()
  return ''
}

const FREE_FALLBACKS = [
  'deepseek/deepseek-chat:free',
  'deepseek/deepseek-r1:free',
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

export function getOpenRouterConfig() {

  const apiKey = (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY || // سازگاری با env قدیمی
    ''
  ).trim()

  const baseUrl = (
    process.env.OPENROUTER_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    'https://openrouter.ai/api/v1'
  )
    .trim()
    .replace(/\/+$/, '')

  const model = (
    process.env.OPENROUTER_MODEL ||
    process.env.OPENAI_MODEL ||
    'deepseek/deepseek-chat:free'
  ).trim()

  return { apiKey, baseUrl, model }
}

/** هدرهای پیشنهادی OpenRouter */
export function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://waima.vercel.app',
    'X-Title': 'WAIMA',
  }
}

export async function openRouterChat(opts: {
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
}): Promise<{ ok: true; content: string; model: string } | { ok: false; status: number; error: string }> {
  const { apiKey, baseUrl, model } = getOpenRouterConfig()
  if (!apiKey) {
    return { ok: false, status: 500, error: 'OPENROUTER_API_KEY تنظیم نشده است' }
  }

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens,
      }),
    })
    let textBody = await resp.text()
    if (!resp.ok) {
      const needsFallback =
        resp.status === 404 ||
        /unavailable for free|not available|model.*not found/i.test(textBody)
      if (needsFallback) {
        for (const fb of FREE_FALLBACKS) {
          if (fb === model) continue
          const retry = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: openRouterHeaders(apiKey),
            body: JSON.stringify({
              model: fb,
              messages: opts.messages,
              temperature: opts.temperature ?? 0.7,
              max_tokens: opts.max_tokens,
            }),
          })
          textBody = await retry.text()
          if (retry.ok) {
            try {
              const data = JSON.parse(textBody)
              const content = extractMessageText(data?.choices?.[0]?.message)
              if (content) return { ok: true, content, model: data?.model || fb }
            } catch {
              /* try next */
            }
          }
        }
      }
      return { ok: false, status: resp.status, error: textBody.slice(0, 500) }
    }
    let data: any
    try {
      data = JSON.parse(textBody)
    } catch {
      return { ok: false, status: 502, error: 'پاسخ JSON نامعتبر از OpenRouter' }
    }
    const content = extractMessageText(data?.choices?.[0]?.message)
    if (!content) {
      return { ok: false, status: 502, error: 'محتوای خالی از مدل: ' + JSON.stringify(data?.choices?.[0]?.message || {}).slice(0, 200) }
    }
    return { ok: true, content, model: data?.model || model }
  } catch (e: unknown) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : 'خطای شبکه OpenRouter',
    }
  }
}
