/**
 * آواتارهای WAIMA — فقط لینک داخل کد (بدون پوشه)
 * سازنده: URL را اینجا عوض کن.
 * هر سطح ۲ آواتار | خاص ۵ آواتار
 */

export type AvatarItem = {
  id: string
  url: string
  label: string
}

function pair(n: number): AvatarItem[] {
  return [
    {
      id: `l${n}-a`,
      url: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=waima-l${n}a`,
      label: `سطح ${n} · الف`,
    },
    {
      id: `l${n}-b`,
      url: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=waima-l${n}b`,
      label: `سطح ${n} · ب`,
    },
  ]
}

export const LEVEL_AVATARS: Record<number, AvatarItem[]> = {
  1: pair(1),
  2: pair(2),
  3: pair(3),
  4: pair(4),
  5: pair(5),
  6: pair(6),
  7: pair(7),
  8: pair(8),
  9: pair(9),
  10: pair(10),
  11: pair(11),
  12: pair(12),
  13: pair(13),
  14: pair(14),
  15: pair(15),
  16: pair(16),
  17: pair(17),
  18: pair(18),
  19: pair(19),
  20: pair(20),
}

/** پروفایل خاص — لینک دلخواه بگذار */
export const SPECIAL_AVATARS: AvatarItem[] = [
  { id: 'sp-phoenix', url: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=waima-phoenix', label: 'ققنوس' },
  { id: 'sp-galaxy', url: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=waima-galaxy', label: 'کهکشان' },
  { id: 'sp-crown', url: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=waima-crown', label: 'تاج' },
  { id: 'sp-dragon', url: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=waima-dragon', label: 'اژدها' },
  { id: 'sp-legend', url: 'https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=waima-legend', label: 'افسانه' },
]

export const AVATAR_KEY = 'waima_avatar_url'
export const SPECIAL_UNLOCKED_KEY = 'waima_special_avatar_ids'

export function defaultAvatarUrl() {
  return LEVEL_AVATARS[1][0].url
}

export function availableForLevel(level: number, unlockedSpecialIds: string[]) {
  const maxL = Math.max(1, Math.min(20, level || 1))
  const out: (AvatarItem & { special?: boolean })[] = []
  for (let L = 1; L <= maxL; L++) {
    for (const a of LEVEL_AVATARS[L] || []) out.push({ ...a })
  }
  for (const id of unlockedSpecialIds || []) {
    const sp = SPECIAL_AVATARS.find((s) => s.id === id)
    if (sp) out.push({ ...sp, special: true })
  }
  return out
}

export function getSavedAvatar(): string {
  try {
    return localStorage.getItem(AVATAR_KEY) || defaultAvatarUrl()
  } catch {
    return defaultAvatarUrl()
  }
}

export function setSavedAvatar(url: string) {
  try {
    localStorage.setItem(AVATAR_KEY, url)
    window.dispatchEvent(new Event('waima-avatar-updated'))
  } catch {
    /* ignore */
  }
}

export function getUnlockedSpecial(): string[] {
  try {
    const raw = localStorage.getItem(SPECIAL_UNLOCKED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function unlockSpecial(id: string) {
  const list = getUnlockedSpecial()
  if (!list.includes(id)) {
    list.push(id)
    try {
      localStorage.setItem(SPECIAL_UNLOCKED_KEY, JSON.stringify(list))
    } catch {
      /* ignore */
    }
  }
  return list
}

export function rollSpecialReward(already: string[]): AvatarItem | null {
  if (Math.random() > 0.35) return null
  const pool = SPECIAL_AVATARS.filter((s) => !already.includes(s.id))
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
