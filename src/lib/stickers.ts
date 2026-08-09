/** استیکرهای پیش‌فرض گفتگوی جهانی WAIMA */

export type SiteSticker = {
  id: string
  emoji: string
  label: string
}

export const SITE_STICKERS: SiteSticker[] = [
  { id: 'hello', emoji: '👋', label: 'سلام' },
  { id: 'think', emoji: '🤔', label: 'در فکر' },
  { id: 'brain', emoji: '🧠', label: 'دانش' },
  { id: 'map', emoji: '🗺️', label: 'نقشه ذهنی' },
  { id: 'idea', emoji: '💡', label: 'ایده' },
  { id: 'question', emoji: '❓', label: 'سؤال' },
  { id: 'cheer', emoji: '🎉', label: 'آفرین' },
  { id: 'calm', emoji: '🌿', label: 'آرامش' },
]

const ID_SET = new Set(SITE_STICKERS.map((s) => s.id))

export function encodeSticker(id: string): string {
  return '[[sticker:' + id + ']]'
}

export function parseSticker(body: string): SiteSticker | null {
  const m = String(body || '').trim().match(/^\[\[sticker:([a-z0-9_]+)\]\]$/)
  if (!m || !ID_SET.has(m[1])) return null
  return SITE_STICKERS.find((s) => s.id === m[1]) || null
}

export function isStickerMessage(body: string): boolean {
  return parseSticker(body) !== null
}
