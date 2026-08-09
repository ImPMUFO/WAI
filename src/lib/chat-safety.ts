import { parseSticker } from '@/lib/stickers'

/** فیلتر ضداسپم و فقط-متن برای گفتگوی جهانی */

export const MAX_BODY = 280
export const MIN_INTERVAL_MS = 12_000
export const MAX_PER_HOUR = 25

const URL_RE =
  /(?:https?:\/\/|www\.|t\.me\/|telegram\.me\/|discord\.gg\/|bit\.ly\/|tinyurl\.com\/|[a-z0-9-]+\.(?:com|ir|net|org|io|app|dev|xyz|me|co|info|link)\b)/i

const CODE_RE = /```|<\/?[a-z][\s\S]*>|javascript:|data:text\/html|on\w+\s*=/i

export type SafetyResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export function sanitizeGlobalMessage(raw: string): SafetyResult {
  let text = String(raw || '')
  // حذف کاراکترهای کنترلی
  text = text
    .split('')
    .filter((ch) => {
      const c = ch.charCodeAt(0)
      return c === 9 || c === 10 || c === 13 || c >= 32
    })
    .join('')
  text = text.replace(/\s+/g, ' ').trim()

  if (!text) return { ok: false, error: 'پیام خالی است.' }

  // استیکر پیش‌فرض سایت
  if (parseSticker(text)) return { ok: true, text }

  if (text.length > MAX_BODY) return { ok: false, error: `حداکثر ${MAX_BODY} کاراکتر.` }

  if (URL_RE.test(text)) {
    return { ok: false, error: 'لینک و آدرس سایت مجاز نیست.' }
  }
  if (CODE_RE.test(text)) {
    return { ok: false, error: 'کد، تگ HTML و محتوای مشکوک مجاز نیست.' }
  }
  if (/(.)\1{9,}/.test(text)) {
    return { ok: false, error: 'پیام شبیه اسپم است.' }
  }
  const letters = text.replace(/[^\p{L}\p{N}]/gu, '')
  if (letters.length < 2 && text.length > 8) {
    return { ok: false, error: 'پیام معتبر نیست.' }
  }

  return { ok: true, text }
}
