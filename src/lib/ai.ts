/**
 * تنظیمات OpenRouter برای WAIMA
 *
 * Vercel env:
 *   OPENROUTER_API_KEY  (الزامی)
 *   OPENROUTER_MODEL    (اختیاری)
 *
 * بسیاری از مدل‌های deepseek/*:free دیگر رایگان نیستند.
 * پیش‌فرض: openrouter/free (مسیریاب مدل‌های واقعاً رایگان)
 *
 * پولی (اگر اعتبار داری):
 *   deepseek/deepseek-chat
 *   deepseek/deepseek-v4-flash
 *   deepseek/deepseek-v4-pro
 */

/** مدل‌هایی که هنوز معمولاً endpoint رایگان دارند */
export const FREE_FALLBACKS = [
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-3-12b-it:free',
  'qwen/qwen3-8b:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
]

/** اگر اعتبار OpenRouter داری این‌ها کیفیت بهتری دارند */
export const PAID_FALLBACKS = [
  'deepseek/deepseek-chat',
  'deepseek/deepseek-v4-flash',
]

export function getOpenRouterConfig() {
  const apiKey = (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
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
    'openrouter/free'
  ).trim()

  return { apiKey, baseUrl, model }
}

export function openRouterHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://waima.vercel.app',
    'X-Title': 'WAIMA',
  }
}

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
    return message.reasoning.trim()
  }
  if (typeof message.text === 'string' && message.text.trim()) return message.text.trim()
  return ''
}

function isUnavailableFreeError(status: number, body: string) {
  return (
    status === 404 ||
    /unavailable for free|not available|model.*not found|no endpoints/i.test(body)
  )
}

/** لیست مدل برای امتحان: مدل env + رایگان‌ها (+ پولی اگر ALLOW_PAID_MODELS=1) */
export function modelsToAttempt(primary: string): string[] {
  const allowPaid =
    process.env.ALLOW_PAID_MODELS === '1' ||
    process.env.ALLOW_PAID_MODELS === 'true' ||
    // اگر صریحاً مدل پولی انتخاب شده
    (!primary.includes(':free') && !primary.startsWith('openrouter/free') && primary.includes('deepseek/'))

  const list = [primary, ...FREE_FALLBACKS]
  if (allowPaid) list.push(...PAID_FALLBACKS)
  // یکتا
  return [...new Set(list.filter(Boolean))]
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

  const tryModels = modelsToAttempt(model)
  let lastError = ''
  let lastStatus = 502

  for (const tryModel of tryModels) {
    try {
      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: openRouterHeaders(apiKey),
        body: JSON.stringify({
          model: tryModel,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.max_tokens,
        }),
      })
      const textBody = await resp.text()
      if (!resp.ok) {
        lastStatus = resp.status
        lastError = textBody.slice(0, 400)
        if (isUnavailableFreeError(resp.status, textBody) || resp.status === 429 || resp.status >= 500) {
          continue
        }
        continue
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
        lastError = 'empty content from ' + tryModel
        continue
      }
      return { ok: true, content, model: data?.model || tryModel }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : 'network'
    }
  }

  return { ok: false, status: lastStatus, error: lastError || 'هیچ مدلی پاسخ نداد' }
}
