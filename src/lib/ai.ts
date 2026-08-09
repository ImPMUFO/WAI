/**
 * تنظیمات OpenRouter برای WAIMA
 *
 * Vercel env:
 *   OPENROUTER_API_KEY  (الزامی)
 *   OPENROUTER_MODEL    (اختیاری — پیش‌فرض: deepseek/deepseek-v4-pro)
 *
 * توجه: DeepSeek V4 Pro روی OpenRouter رایگان نیست (~$0.44 / $0.87 per 1M tokens).
 * برای تست رایگان می‌توانی بگذاری:
 *   OPENROUTER_MODEL=deepseek/deepseek-v4-flash:free
 * یا:
 *   OPENROUTER_MODEL=openrouter/free
 */

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
    'deepseek/deepseek-v4-pro'
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
    const textBody = await resp.text()
    if (!resp.ok) {
      return { ok: false, status: resp.status, error: textBody.slice(0, 500) }
    }
    let data: any
    try {
      data = JSON.parse(textBody)
    } catch {
      return { ok: false, status: 502, error: 'پاسخ JSON نامعتبر از OpenRouter' }
    }
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      return { ok: false, status: 502, error: 'محتوای خالی از مدل' }
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
