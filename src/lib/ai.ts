/**
 * تنظیمات SambaNova برای WAIMA
 *
 * Vercel:
 *   SAMBANOVA_API_KEY          کلید اصلی (الزامی)
 *   SAMBANOVA_API_KEY_2        کلید دوم (اختیاری — چرخش هنگام 429/خطا)
 *   SAMBANOVA_API_KEY_3        کلید سوم (اختیاری)
 *   SAMBANOVA_API_KEY_CHAT     مخصوص گفتگو (اختیاری)
 *   SAMBANOVA_API_KEY_ANALYZER مخصوص آنالیزور/نقشه (اختیاری)
 *   SAMBANOVA_API_KEY_GAMES    مخصوص بازی‌ها (اختیاری)
 *   SAMBANOVA_BASE_URL         پیش‌فرض https://api.sambanova.ai/v1
 *   SAMBANOVA_MODEL            پیش‌فرض DeepSeek-V3.1
 */

export type AIFeature = 'chat' | 'analyzer' | 'games' | 'default'

export const FREE_FALLBACKS = [
  'DeepSeek-V3.1',
  'DeepSeek-V3.2',
  'Meta-Llama-3.3-70B-Instruct',
  'MiniMax-M2.7',
]

export const PAID_FALLBACKS = ['DeepSeek-V3.1', 'DeepSeek-V3.2']

function splitKeys(raw: string): string[] {
  return raw
    .split(/[\s,|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** همه کلیدهای عمومی برای چرخش */
export function listSambaKeys(): string[] {
  const keys: string[] = []
  const main = (process.env.SAMBANOVA_API_KEY || '').trim()
  if (main) keys.push(...splitKeys(main))
  for (const k of ['SAMBANOVA_API_KEY_2', 'SAMBANOVA_API_KEY_3', 'SAMBANOVA_API_KEYS']) {
    const v = (process.env[k] || '').trim()
    if (v) keys.push(...splitKeys(v))
  }
  return [...new Set(keys)]
}

function featureKey(feature: AIFeature): string | null {
  if (feature === 'chat') return (process.env.SAMBANOVA_API_KEY_CHAT || '').trim() || null
  if (feature === 'analyzer') return (process.env.SAMBANOVA_API_KEY_ANALYZER || '').trim() || null
  if (feature === 'games') return (process.env.SAMBANOVA_API_KEY_GAMES || '').trim() || null
  return null
}

export function getAIConfig(feature: AIFeature = 'default') {
  const baseUrl = (process.env.SAMBANOVA_BASE_URL || 'https://api.sambanova.ai/v1')
    .trim()
    .replace(/\/+$/, '')
  const model = (process.env.SAMBANOVA_MODEL || 'DeepSeek-V3.1').trim()
  const preferred = featureKey(feature)
  const pool = listSambaKeys()
  const apiKey = preferred || pool[0] || ''
  return { apiKey, baseUrl, model, keys: preferred ? [preferred, ...pool.filter((k) => k !== preferred)] : pool }
}

export function aiHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
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
  if (typeof message.reasoning === 'string' && message.reasoning.trim()) return message.reasoning.trim()
  if (typeof message.text === 'string' && message.text.trim()) return message.text.trim()
  return ''
}

function isRetryable(status: number, body: string) {
  return (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 429 ||
    status >= 500 ||
    /rate limit|quota|unavailable|not found|invalid api/i.test(body)
  )
}

export function modelsToAttempt(primary: string): string[] {
  const list = [primary, ...FREE_FALLBACKS, ...PAID_FALLBACKS]
  return [...new Set(list.filter(Boolean))]
}

export function sanitizeAssistantText(text: string): string {
  const t = (text || '').trim()
  if (!t) return ''
  const leakPatterns = [
    /we need to follow rules/i,
    /must answer in/i,
    /must be short/i,
    /language rule/i,
    /when useful:\s*one key point/i,
    /cannot access the model/i,
    /stuck with error/i,
    /user writes/i,
  ]
  const hit = leakPatterns.filter((re) => re.test(t)).length
  if (hit >= 2) return ''
  if (/^We need to follow rules/i.test(t)) return ''
  let out = t.replace(/^\s*ارزیاب\s*بخوان[\s\S]*?\n+/u, '')
  return out.trim()
}

/** فراخوانی SambaNova با چرخش کلید و مدل */
export async function sambaChat(opts: {
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
  feature?: AIFeature
}): Promise<{ ok: true; content: string; model: string } | { ok: false; status: number; error: string }> {
  const cfg = getAIConfig(opts.feature || 'default')
  const keys = cfg.keys.length ? cfg.keys : cfg.apiKey ? [cfg.apiKey] : []
  if (!keys.length) {
    return { ok: false, status: 500, error: 'SAMBANOVA_API_KEY تنظیم نشده است' }
  }

  const tryModels = modelsToAttempt(cfg.model)
  let lastError = ''
  let lastStatus = 502

  for (const apiKey of keys) {
    for (const tryModel of tryModels) {
      try {
        const resp = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: aiHeaders(apiKey),
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
          if (isRetryable(resp.status, textBody)) continue
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
          lastError = 'empty content from ' + tryModel
          continue
        }
        return { ok: true, content: clean, model: data?.model || tryModel }
      } catch (e: unknown) {
        lastError = e instanceof Error ? e.message : 'network'
      }
    }
  }

  return { ok: false, status: lastStatus, error: lastError || 'هیچ کلید/مدلی پاسخ نداد' }
}
