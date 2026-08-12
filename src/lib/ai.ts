/**
 * هوش مصنوعی WAIMA
 * اولویت: Gemini → در صورت خطا/سقف: Groq
 *
 * Vercel:
 *   GEMINI_API_KEY     اصلی (الزامی پیشنهادی)
 *   GEMINI_MODEL       پیش‌فرض gemini-3.6-flash
 *   GEMINI_BASE_URL    اختیاری
 *
 *   GROQ_API_KEY       پشتیبان
 *   GROQ_MODEL         پیش‌فرض llama-3.3-70b-versatile
 */

export type AIFeature = 'chat' | 'analyzer' | 'games' | 'default'

const ATTEMPT_TIMEOUT_MS = 22000

export function getAIConfig(_feature: AIFeature = 'default') {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  const baseUrl = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai')
    .trim()
    .replace(/\/+$/, '')
  const model = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim()
  const keys = apiKey ? [apiKey] : []
  return { apiKey, baseUrl, model, keys }
}

export function aiHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
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
  if (leakPatterns.filter((re) => re.test(t)).length >= 2) return ''
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

type Provider = {
  name: string
  apiKey: string
  baseUrl: string
  model: string
}

function listProviders(): Provider[] {
  const list: Provider[] = []

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  if (geminiKey) {
    list.push({
      name: 'gemini',
      apiKey: geminiKey,
      baseUrl: (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai')
        .trim()
        .replace(/\/+$/, ''),
      model: (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim(),
    })
  }

  const groqKey = (process.env.GROQ_API_KEY || '').trim()
  if (groqKey) {
    list.push({
      name: 'groq',
      apiKey: groqKey,
      baseUrl: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/+$/, ''),
      model: (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim(),
    })
  }

  return list
}

async function callProvider(
  p: Provider,
  opts: { messages: { role: string; content: string }[]; temperature?: number; max_tokens?: number }
): Promise<{ ok: true; content: string; model: string } | { ok: false; status: number; error: string }> {
  try {
    const resp = await fetchWithTimeout(`${p.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: aiHeaders(p.apiKey),
      body: JSON.stringify({
        model: p.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens ?? 4096,
      }),
    })
    const textBody = await resp.text()
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: `${p.name} ${resp.status}: ${textBody.slice(0, 280)}` }
    }
    let data: any
    try {
      data = JSON.parse(textBody)
    } catch {
      return { ok: false, status: 502, error: `${p.name} invalid json` }
    }
    const content = extractMessageText(data?.choices?.[0]?.message)
    const clean = sanitizeAssistantText(content)
    if (!clean) {
      return { ok: false, status: 502, error: `${p.name} empty content` }
    }
    return { ok: true, content: clean, model: `${p.name}:${data?.model || p.model}` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'network'
    return {
      ok: false,
      status: 504,
      error: `${p.name}: ${/abort/i.test(msg) ? 'timeout' : msg}`,
    }
  }
}

/** Gemini اول، بعد Groq */
export async function waimaChat(opts: {
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
  feature?: AIFeature
}): Promise<{ ok: true; content: string; model: string } | { ok: false; status: number; error: string }> {
  const providers = listProviders()
  if (!providers.length) {
    return {
      ok: false,
      status: 500,
      error: 'هیچ کلیدی تنظیم نشده. GEMINI_API_KEY یا GROQ_API_KEY را در Vercel بگذار.',
    }
  }

  const errors: string[] = []
  for (const p of providers) {
    const result = await callProvider(p, opts)
    if (result.ok) return result
    errors.push(result.error)
    // 429 / 5xx / timeout → برو سراغ بعدی
  }

  return {
    ok: false,
    status: 502,
    error: errors.join(' | ') || 'all providers failed',
  }
}
