export type AIFeature = 'chat' | 'analyzer' | 'games' | 'default'

const ATTEMPT_TIMEOUT_MS = 15000

export function getAIConfig(feature: AIFeature = 'default') {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  const geminiBase = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').trim().replace(/\/+$/, '')
  const geminiModel = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim()
  const groqKey = (process.env.GROQ_API_KEY || '').trim()
  const groqBase = (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/+$/, '')
  const groqModel = (feature === 'chat'
    ? process.env.GROQ_CHAT_MODEL
    : process.env.GROQ_MODEL) || 'openai/gpt-oss-120b'

  return {
    apiKey: geminiKey,
    baseUrl: geminiBase,
    model: geminiModel,
    keys: geminiKey ? [geminiKey] : [],
    groqKey,
    groqBase,
    groqModel: groqModel.trim(),
  }
}

export function aiHeaders(apiKey: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }
}

export function extractMessageText(message: any): string {
  if (!message) return ''
  const c = message.content
  if (typeof c === 'string' && c.trim()) return c.trim()
  if (Array.isArray(c)) {
    const joined = c.map((part) => typeof part === 'string' ? part : part?.text || part?.content || '').join('').trim()
    if (joined) return joined
  }
  if (typeof message.reasoning === 'string' && message.reasoning.trim()) return message.reasoning.trim()
  if (typeof message.text === 'string' && message.text.trim()) return message.text.trim()
  return ''
}

export function sanitizeAssistantText(text: string): string {
  const t = (text || '').trim()
  if (!t) return ''
  const leaks = [
    /we need to follow rules/i,
    /must answer in/i,
    /language rule/i,
    /when useful:\s*one key point/i,
    /user writes/i,
  ]
  if (leaks.filter((re) => re.test(t)).length >= 2) return ''
  return t
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

type Provider = { name: string; apiKey: string; baseUrl: string; model: string }

function listProviders(feature: AIFeature): Provider[] {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  const groqKey = (process.env.GROQ_API_KEY || '').trim()
  const providers: Provider[] = []

  if (feature === 'chat' && groqKey) {
    const model = (process.env.GROQ_CHAT_MODEL || process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b').trim()
    providers.push({
      name: `groq:${model}`,
      apiKey: groqKey,
      baseUrl: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/+$/, ''),
      model,
    })
  }

  if (geminiKey) {
    providers.push({
      name: 'gemini',
      apiKey: geminiKey,
      baseUrl: (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').trim().replace(/\/+$/, ''),
      model: (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim(),
    })
  }

  if (groqKey) {
    const primary = (process.env.GROQ_MODEL || 'openai/gpt-oss-120b').trim()
    const models = [...new Set([primary, 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'])]
    for (const model of models) {
      if (!providers.some((p) => p.model === model)) {
        providers.push({
          name: `groq:${model}`,
          apiKey: groqKey,
          baseUrl: (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').trim().replace(/\/+$/, ''),
          model,
        })
      }
    }
  }

  return providers
}

async function callProvider(
  p: Provider,
  opts: { messages: { role: string; content: string }[]; temperature?: number; max_tokens?: number }
) {
  try {
    const resp = await fetchWithTimeout(`${p.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: aiHeaders(p.apiKey),
      body: JSON.stringify({
        model: p.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.max_tokens ?? 1800,
      }),
    })

    const textBody = await resp.text()
    if (!resp.ok) return { ok: false as const, status: resp.status, error: `${p.name} ${resp.status}: ${textBody.slice(0, 240)}` }

    let data: any
    try { data = JSON.parse(textBody) } catch { return { ok: false as const, status: 502, error: `${p.name} invalid json` } }

    const clean = sanitizeAssistantText(extractMessageText(data?.choices?.[0]?.message))
    if (!clean) return { ok: false as const, status: 502, error: `${p.name} empty content` }

    return { ok: true as const, content: clean, model: `${p.name}:${data?.model || p.model}` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'network'
    return { ok: false as const, status: 504, error: `${p.name}: ${/abort/i.test(msg) ? 'timeout' : msg}` }
  }
}

export async function waimaChat(opts: {
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
  feature?: AIFeature
}) {
  const feature = opts.feature || 'default'
  const providers = listProviders(feature)
  if (!providers.length) {
    return {
      ok: false as const,
      status: 500,
      error: 'هیچ کلیدی تنظیم نشده. GEMINI_API_KEY یا GROQ_API_KEY را در Vercel بگذار.',
    }
  }

  const errors: string[] = []
  for (const p of providers) {
    const result = await callProvider(p, opts)
    if (result.ok) return result
    errors.push(result.error)
  }

  return { ok: false as const, status: 502, error: errors.slice(0, 4).join(' | ') || 'all providers failed' }
}
