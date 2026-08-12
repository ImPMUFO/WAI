/**
 * هوش مصنوعی WAIMA
 *
 * اولویت:
 *   1) Gemini (اگر GEMINI_API_KEY باشد)
 *   2) SambaNova (کلیدهای SAMBANOVA_*)
 *
 * Vercel — Gemini:
 *   GEMINI_API_KEY     کلید از Google AI Studio (پیشنهادی)
 *   GEMINI_MODEL       پیش‌فرض: gemini-2.0-flash
 *
 * Vercel — SambaNova (پشتیبان):
 *   SAMBANOVA_API_KEY / _2 / _3
 *   SAMBANOVA_BASE_URL  پیش‌فرض https://api.sambanova.ai/v1
 *   SAMBANOVA_MODEL     پیش‌فرض DeepSeek-V3.1
 */

export type AIFeature = 'chat' | 'analyzer' | 'games' | 'default'

const ATTEMPT_TIMEOUT_MS = 22000

const SAMBA_FALLBACKS = ['DeepSeek-V3.1', 'DeepSeek-V3.2', 'Meta-Llama-3.3-70B-Instruct']

function splitKeys(raw: string): string[] {
  return raw
    .split(/[\s,|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

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
  const baseUrl = (process.env.SAMBANOVA_BASE_URL || 'https://api.sambanova.ai/v1').trim().replace(/\/+$/, '')
  const model = (process.env.SAMBANOVA_MODEL || 'DeepSeek-V3.1').trim()
  const preferred = featureKey(feature)
  const pool = listSambaKeys()
  const apiKey = preferred || pool[0] || ''
  return {
    apiKey,
    baseUrl,
    model,
    keys: preferred ? [preferred, ...pool.filter((k) => k !== preferred)] : pool,
  }
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
  return t.replace(/^\s*ارزیاب\s*بخوان[\s\S]*?\n+/u, '').trim()
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = ATTEMPT_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Gemini — سازگار با OpenAI */
async function tryGemini(opts: {
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
}): Promise<{ ok: true; content: string; model: string } | { ok: false; error: string }> {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  if (!apiKey) return { ok: false, error: 'no gemini key' }

  const model = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim()
  // endpoint سازگار با OpenAI
  const base = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai')
    .trim()
    .replace(/\/+$/, '')

  try {
    const resp = await fetchWithTimeout(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens ?? 400,
      }),
    })
    const textBody = await resp.text()
    if (!resp.ok) {
      return { ok: false, error: `gemini ${resp.status}: ${textBody.slice(0, 200)}` }
    }
    let data: any
    try {
      data = JSON.parse(textBody)
    } catch {
      return { ok: false, error: 'gemini invalid json' }
    }
    const content = extractMessageText(data?.choices?.[0]?.message)
    const clean = sanitizeAssistantText(content)
    if (!clean) return { ok: false, error: 'gemini empty content' }
    return { ok: true, content: clean, model: data?.model || model }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'network'
    return { ok: false, error: /abort/i.test(msg) ? 'gemini timeout' : msg }
  }
}

/** SambaNova با چرخش کلید */
async function trySamba(opts: {
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
  feature?: AIFeature
}): Promise<{ ok: true; content: string; model: string } | { ok: false; status: number; error: string }> {
  const cfg = getAIConfig(opts.feature || 'default')
  const keys = (cfg.keys.length ? cfg.keys : cfg.apiKey ? [cfg.apiKey] : []).slice(0, 3)
  if (!keys.length) {
    return { ok: false, status: 500, error: 'SAMBANOVA_API_KEY تنظیم نشده' }
  }

  const tryModels = [...new Set([cfg.model, ...SAMBA_FALLBACKS])].filter(Boolean).slice(0, 2)
  let lastError = ''
  let lastStatus = 502

  for (const apiKey of keys) {
    for (const tryModel of tryModels) {
      try {
        const resp = await fetchWithTimeout(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: aiHeaders(apiKey),
          body: JSON.stringify({
            model: tryModel,
            messages: opts.messages,
            temperature: opts.temperature ?? 0.7,
            max_tokens: opts.max_tokens ?? 400,
          }),
        })
        const textBody = await resp.text()
        if (!resp.ok) {
          lastStatus = resp.status
          lastError = textBody.slice(0, 400)
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
        const msg = e instanceof Error ? e.message : 'network'
        lastError = /abort/i.test(msg) ? `timeout on ${tryModel}` : msg
        lastStatus = 504
      }
    }
  }
  return { ok: false, status: lastStatus, error: lastError || 'samba failed' }
}

/**
 * فراخوانی اصلی: اول Gemini، بعد SambaNova
 * نام تابع برای سازگاری با بقیه پروژه sambaChat مانده است.
 */
export async function sambaChat(opts: {
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
  feature?: AIFeature
}): Promise<{ ok: true; content: string; model: string } | { ok: false; status: number; error: string }> {
  const gem = await tryGemini(opts)
  if (gem.ok) return gem

  const samba = await trySamba(opts)
  if (samba.ok) return samba

  return {
    ok: false,
    status: samba.status || 502,
    error: [gem.ok === false ? gem.error : '', samba.error].filter(Boolean).join(' | ') || 'no provider',
  }
}

export function modelsToAttempt(primary: string): string[] {
  return [...new Set([primary, ...SAMBA_FALLBACKS].filter(Boolean))]
}
