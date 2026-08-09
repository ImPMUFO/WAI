/**
 * تنظیمات SambaNova برای WAIMA
 *
 * Vercel env:
 *   SAMBANOVA_API_KEY    (الزامی)
 *   SAMBANOVA_BASE_URL   (اختیاری — پیش‌فرض https://api.sambanova.ai/v1)
 *   SAMBANOVA_MODEL      (اختیاری — پیش‌فرض DeepSeek-V3.1)
 */

/** مدل‌های جایگزین روی SambaNova */
export const FREE_FALLBACKS = [
  'DeepSeek-V3.1',
  'DeepSeek-V3.2',
  'Meta-Llama-3.3-70B-Instruct',
  'MiniMax-M2.7',
]

/** مدل‌های پشتیبان (همان مدل‌های قوی SambaNova) */
export const PAID_FALLBACKS = [
  'DeepSeek-V3.1',
  'DeepSeek-V3.2',
]

export function getOpenRouterConfig() {
  const apiKey = (process.env.SAMBANOVA_API_KEY || '').trim()

  const baseUrl = (
    process.env.SAMBANOVA_BASE_URL ||
    'https://api.sambanova.ai/v1'
  )
    .trim()
    .replace(/\/+$/, '')

  const model = (
    process.env.SAMBANOVA_MODEL ||
    'DeepSeek-V3.1'
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
    process.env.ALLOW_PAID_MODELS === 'true'

  const list = [primary, ...FREE_FALLBACKS]
  if (allowPaid) list.push(...PAID_FALLBACKS)
  // یکتا
  return [...new Set(list.filter(Boolean))]
}


/** پاسخ‌های خراب: نشت system prompt / monologue انگلیسی قوانین */
export function sanitizeAssistantText(text: string): string {
  const t = (text || '').trim()
  if (!t) return ''

  const leakPatterns = [
    /we need to follow rules/i,
    /must answer in/i,
    /must be short/i,
    /language rule/i,
    /when useful:\s*one key point/i,
    /who am i\? \/ mind mapper/i,
    /waima, a warm learning/i,
    /cannot access the model/i,
    /stuck with error/i,
    /the instruction about style/i,
    /thus answer:/i,
    /so answer in persian/i,
    /user writes/i,
    /user wants a response/i,
  ]
  const hit = leakPatterns.filter((re) => re.test(t)).length
  // متن کاملاً meta / انگلیسی درباره قوانین
  if (hit >= 2) return ''
  if (/^We need to follow rules/i.test(t)) return ''
  if (hit >= 1 && t.length > 400 && /must |rules|instruction/i.test(t)) return ''

  // بریدن پیشوندهای meta کوتاه
  let out = t
  out = out.replace(/^\s*ارزیاب\s*بخوان[\s\S]*?\n+/u, '')
  return out.trim()
}

export async function openRouterChat(opts: {
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
}): Promise<{ ok: true; content: string; model: string } | { ok: false; status: number; error: string }> {
  const { apiKey, baseUrl, model } = getOpenRouterConfig()
  if (!apiKey) {
    return { ok: false, status: 500, error: 'SAMBANOVA_API_KEY تنظیم نشده است' }
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
      const clean = sanitizeAssistantText(content)
      if (!clean) {
        lastError = 'leaked or empty content from ' + tryModel
        continue
      }
      return { ok: true, content: clean, model: data?.model || tryModel }
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : 'network'
    }
  }

  return { ok: false, status: lastStatus, error: lastError || 'هیچ مدلی پاسخ نداد' }
}
