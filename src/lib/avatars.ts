export type AvatarManifest = {
  levels: Record<string, string[]>
  special: string[]
}

export const AVATAR_KEY = 'waima_avatar_path'
export const SPECIAL_UNLOCKED_KEY = 'waima_special_avatars'

let cachedManifest: AvatarManifest | null = null

export async function loadAvatarManifest(): Promise<AvatarManifest> {
  if (cachedManifest) return cachedManifest
  try {
    const res = await fetch('/profiles/manifest.json', { cache: 'no-store' })
    if (res.ok) {
      cachedManifest = (await res.json()) as AvatarManifest
      return cachedManifest
    }
  } catch {
    /* fallthrough */
  }
  // پیش‌فرض اگر manifest نبود
  const levels: Record<string, string[]> = {}
  for (let i = 1; i <= 20; i++) levels[String(i)] = ['a.svg', 'b.svg', 'c.svg']
  cachedManifest = {
    levels,
    special: ['phoenix.svg', 'galaxy.svg', 'crown.svg', 'dragon.svg', 'crystal.svg', 'legend.svg'],
  }
  return cachedManifest
}

export function levelAvatarUrl(level: number, file: string) {
  return `/profiles/level-${level}/${file}`
}

export function specialAvatarUrl(file: string) {
  return `/profiles/special/${file}`
}

/** همه آواتارهای قابل انتخاب برای سطح فعلی */
export function availableForLevel(
  manifest: AvatarManifest,
  level: number,
  unlockedSpecial: string[]
): { path: string; label: string; special?: boolean }[] {
  const out: { path: string; label: string; special?: boolean }[] = []
  const maxL = Math.max(1, Math.min(20, level || 1))
  for (let L = 1; L <= maxL; L++) {
    const files = manifest.levels[String(L)] || []
    for (const f of files) {
      out.push({ path: levelAvatarUrl(L, f), label: `سطح ${L}` })
    }
  }
  for (const f of unlockedSpecial || []) {
    out.push({ path: specialAvatarUrl(f), label: 'خاص', special: true })
  }
  return out
}

export function getSavedAvatar(): string {
  try {
    return localStorage.getItem(AVATAR_KEY) || '/profiles/level-1/a.svg'
  } catch {
    return '/profiles/level-1/a.svg'
  }
}

export function setSavedAvatar(path: string) {
  try {
    localStorage.setItem(AVATAR_KEY, path)
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

export function unlockSpecial(file: string) {
  const list = getUnlockedSpecial()
  if (!list.includes(file)) {
    list.push(file)
    try {
      localStorage.setItem(SPECIAL_UNLOCKED_KEY, JSON.stringify(list))
    } catch {
      /* ignore */
    }
  }
  return list
}

/** شانس جایزه خاص هنگام لول‌آپ (~35٪) */
export function rollSpecialReward(manifest: AvatarManifest, already: string[]): string | null {
  if (Math.random() > 0.35) return null
  const pool = (manifest.special || []).filter((s) => !already.includes(s))
  if (!pool.length) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
