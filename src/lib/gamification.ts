import { bumpFromQuiz } from '@/lib/mindmap'

export const GAME_KEY = 'wai_game_state_v1'
export const ACTIVE_DOMAINS_KEY = 'wai_active_domains'
export const PENDING_LEVEL_UP_KEY = 'waima_pending_level_up'
export const WHEEL_CHANCES_KEY = 'waima_wheel_chances'
export const WHEEL_EARNED_KEY = 'waima_wheel_earned_v2'
export const WHEEL_SPENT_KEY = 'waima_wheel_spent_v2'

export type AchievementId =
  | 'first_chat'
  | 'ten_messages'
  | 'fifty_messages'
  | 'first_map'
  | 'three_domains'
  | 'seven_day_streak'
  | 'quiz_master'
  | 'night_owl'

export type MissionId = 'daily_chat' | 'daily_quiz' | 'weekly_domains' | 'weekly_messages'

export type GameState = {
  xp: number
  level: number
  totalMessages: number
  totalQuizzes: number
  streak: number
  lastActiveDate: string
  achievements: AchievementId[]
  missions: Record<
    MissionId,
    { progress: number; target: number; claimed: boolean; resetAt: string }
  >
  history: { ts: number; reason: string; xp: number }[]
  answeredQuestions: string[]
  xpFromGamesToday: number
  xpGamesDate: string
}

export const MAX_LEVEL = 20
export const DAILY_GAME_XP_CAP = 50

export function xpForLevel(level: number) {
  if (level < 1) return 50
  if (level >= MAX_LEVEL) return 0
  return 50 * level
}

export function totalXpForLevel(level: number) {
  const L = Math.max(1, Math.min(level, MAX_LEVEL))
  return (50 * (L - 1) * L) / 2
}

export function levelTitle(level: number, locale = 'fa') {
  const L = Math.max(1, Math.min(level || 1, MAX_LEVEL))
  const fa = [
    '', '🌱 تازه‌وارد', '🧭 کاوشگر', '🔍 جست‌وجوگر', '📘 دانش‌جو',
    '📚 دانشیار', '🧠 اندیشه‌ور', '🔭 اندیشمند', '🌟 راهبر ذهن', '🏛️ استاد', '👑 حکیم',
  ]
  const en = [
    '', '🌱 Newcomer', '🧭 Explorer', '🔍 Seeker', '📘 Learner',
    '📚 Scholar', '🧠 Thinker', '🔭 Sage', '🌟 Mind guide', '🏛️ Master', '👑 Sage+',
  ]
  const table = locale === 'en' ? en : fa
  if (L < table.length) return table[L]
  return L <= 15 ? (locale === 'en' ? `✨ Adept ${L}` : `✨ خبره ${L}`) : (locale === 'en' ? `👑 Legend ${L}` : `👑 افسانه ${L}`)
}

export function levelFromXp(xp: number) {
  let level = 1
  let remain = Math.max(0, Math.floor(xp || 0))
  while (level < MAX_LEVEL) {
    const need = xpForLevel(level)
    if (remain < need) return { level, intoLevel: remain, need, remaining: need - remain }
    remain -= need
    level += 1
  }
  return { level: MAX_LEVEL, intoLevel: 0, need: 0, remaining: 0 }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function defaultMissions(): GameState['missions'] {
  const t = today()
  return {
    daily_chat: { progress: 0, target: 5, claimed: false, resetAt: t },
    daily_quiz: { progress: 0, target: 1, claimed: false, resetAt: t },
    weekly_domains: { progress: 0, target: 3, claimed: false, resetAt: t },
    weekly_messages: { progress: 0, target: 25, claimed: false, resetAt: t },
  }
}

export function defaultGameState(): GameState {
  return {
    xp: 0,
    level: 1,
    totalMessages: 0,
    totalQuizzes: 0,
    streak: 0,
    lastActiveDate: '',
    achievements: [],
    missions: defaultMissions(),
    history: [],
    answeredQuestions: [],
    xpFromGamesToday: 0,
    xpGamesDate: today(),
  }
}

function normalizeGame(g: GameState): GameState {
  const base = defaultGameState()
  const missions = { ...base.missions, ...(g.missions || {}) }
  const t = today()

  ;(['daily_chat', 'daily_quiz'] as MissionId[]).forEach((id) => {
    if (missions[id].resetAt !== t) {
      missions[id] = { ...missions[id], progress: 0, claimed: false, resetAt: t }
    }
  })

  ;(['weekly_domains', 'weekly_messages'] as MissionId[]).forEach((id) => {
    if (missions[id].resetAt < addDays(t, -7)) {
      missions[id] = { ...missions[id], progress: 0, claimed: false, resetAt: t }
    }
  })

  return {
    ...base,
    ...g,
    missions,
    achievements: Array.isArray(g.achievements) ? g.achievements : [],
    history: Array.isArray(g.history) ? g.history.slice(-40) : [],
    // مهم: دیگر slice(-300) نداریم. سؤال قدیمی هیچ‌وقت فراموش نمی‌شود.
    answeredQuestions: Array.isArray(g.answeredQuestions)
      ? Array.from(new Set(g.answeredQuestions.map(String)))
      : [],
    xpFromGamesToday: typeof g.xpFromGamesToday === 'number' ? g.xpFromGamesToday : 0,
    xpGamesDate: typeof g.xpGamesDate === 'string' ? g.xpGamesDate : t,
  }
}

export function loadGame(): GameState {
  if (typeof window === 'undefined') return defaultGameState()
  try {
    const raw = localStorage.getItem(GAME_KEY)
    return raw ? normalizeGame(JSON.parse(raw) as GameState) : defaultGameState()
  } catch {
    return defaultGameState()
  }
}

export function saveGame(g: GameState) {
  localStorage.setItem(GAME_KEY, JSON.stringify(g))
  window.dispatchEvent(new Event('wai-game-updated'))
  try {
    void import('@/lib/sync').then((m) => void m.syncGameStateToServer(g, g.xp, g.level, g.streak))
  } catch {}
}

export function markDomainActive(domain: string) {
  try {
    const raw = localStorage.getItem(ACTIVE_DOMAINS_KEY)
    const set = new Set<string>(raw ? JSON.parse(raw) : [])
    set.add(domain)
    localStorage.setItem(ACTIVE_DOMAINS_KEY, JSON.stringify([...set]))
  } catch {
    localStorage.setItem(ACTIVE_DOMAINS_KEY, JSON.stringify([domain]))
  }
}

export function getActiveDomains() {
  try {
    const raw = localStorage.getItem(ACTIVE_DOMAINS_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

const ACHIEVEMENTS: Record<AchievementId, { title: string; desc: string; xp: number }> = {
  first_chat: { title: 'اولین گفتگو', desc: 'اولین پیام را فرستادی', xp: 20 },
  ten_messages: { title: '۱۰ پیام', desc: 'ده پیام در مجموع', xp: 40 },
  fifty_messages: { title: '۵۰ پیام', desc: 'پنجاه پیام در مجموع', xp: 100 },
  first_map: { title: 'نقشه‌نگار', desc: 'اولین به‌روزرسانی نقشه ذهن', xp: 30 },
  three_domains: { title: 'چندساحتی', desc: 'فعالیت در ۳ حوزه', xp: 50 },
  seven_day_streak: { title: 'هفت‌روزه', desc: '۷ روز پیاپی فعالیت', xp: 120 },
  quiz_master: { title: 'استاد آزمون', desc: '۱۰ بازی/آزمون', xp: 80 },
  night_owl: { title: 'شب‌زنده‌دار', desc: 'فعالیت بین ۱۲ تا ۵ صبح', xp: 25 },
}

function grantAchievement(g: GameState, id: AchievementId) {
  if (g.achievements.includes(id)) return g
  const meta = ACHIEVEMENTS[id]
  return {
    ...g,
    achievements: [...g.achievements, id],
    xp: g.xp + meta.xp,
    history: [{ ts: Date.now(), reason: `مدال: ${meta.title}`, xp: meta.xp }, ...g.history].slice(0, 40),
  }
}

function touchStreak(g: GameState) {
  const t = today()
  if (g.lastActiveDate === t) return g
  return {
    ...g,
    streak: g.lastActiveDate === addDays(t, -1) ? g.streak + 1 : 1,
    lastActiveDate: t,
  }
}

export function addXp(g: GameState, amount: number, reason: string) {
  const before = levelFromXp(g.xp)
  let next = touchStreak({
    ...g,
    xp: g.xp + amount,
    history: [{ ts: Date.now(), reason, xp: amount }, ...g.history].slice(0, 40),
  })
  const after = levelFromXp(next.xp)
  next.level = after.level

  if (after.level > before.level) {
    const gained = after.level - before.level
    next.history = [
      { ts: Date.now(), reason: `ارتقا به سطح ${after.level}`, xp: 0 },
      ...next.history,
    ].slice(0, 40)

    try {
      const current = getWheelChances()
      const earned = Number(localStorage.getItem(WHEEL_EARNED_KEY) || '0') || 0
      localStorage.setItem(WHEEL_EARNED_KEY, String(Math.max(earned, current) + gained))
      localStorage.setItem(WHEEL_CHANCES_KEY, String(current + gained))

      // بالاترین سطحِ بازشده را نگه می‌داریم؛ چند level-up پشت‌سرهم هم گم نمی‌شود.
      const pending = Math.max(
        Number(localStorage.getItem(PENDING_LEVEL_UP_KEY) || '0') || 0,
        after.level
      )
      localStorage.setItem(PENDING_LEVEL_UP_KEY, String(pending))

      window.dispatchEvent(new Event('waima-level-up'))
      window.dispatchEvent(new Event('waima-wheel-chances'))
    } catch {}
  }

  return next
}

export function onChatMessage(domain: string) {
  markDomainActive(domain)
  let g = loadGame()
  g.totalMessages += 1
  g = addXp(g, 8, 'پیام در گفتگو')

  g.missions.daily_chat.progress = Math.min(g.missions.daily_chat.target, g.missions.daily_chat.progress + 1)
  g.missions.weekly_messages.progress = Math.min(g.missions.weekly_messages.target, g.missions.weekly_messages.progress + 1)

  const domains = getActiveDomains()
  g.missions.weekly_domains.progress = Math.min(g.missions.weekly_domains.target, domains.length)

  if (g.totalMessages >= 1) g = grantAchievement(g, 'first_chat')
  if (g.totalMessages >= 10) g = grantAchievement(g, 'ten_messages')
  if (g.totalMessages >= 50) g = grantAchievement(g, 'fifty_messages')
  if (domains.length >= 3) g = grantAchievement(g, 'three_domains')
  if (g.streak >= 7) g = grantAchievement(g, 'seven_day_streak')

  if (new Date().getHours() < 5) g = grantAchievement(g, 'night_owl')

  if (g.missions.daily_chat.progress >= g.missions.daily_chat.target && !g.missions.daily_chat.claimed) {
    g.missions.daily_chat.claimed = true
    g = addXp(g, 25, 'مأموریت روزانه گفتگو')
  }

  saveGame(g)
  return g
}

export function onMapUpdated() {
  let g = loadGame()
  g = addXp(g, 12, 'به‌روزرسانی نقشه ذهن')
  g = grantAchievement(g, 'first_map')
  saveGame(g)
  return g
}

export function onQuizFinished(scoreRatio: number) {
  let g = loadGame()
  g.totalQuizzes += 1
  g = addXp(g, 15 + Math.round(scoreRatio * 25), 'اتمام بازی آموزشی')
  g.missions.daily_quiz.progress = Math.min(g.missions.daily_quiz.target, g.missions.daily_quiz.progress + 1)

  if (g.missions.daily_quiz.progress >= g.missions.daily_quiz.target && !g.missions.daily_quiz.claimed) {
    g.missions.daily_quiz.claimed = true
    g = addXp(g, 20, 'مأموریت روزانه آزمون')
  }

  if (g.totalQuizzes >= 10) g = grantAchievement(g, 'quiz_master')
  saveGame(g)
  return g
}

export function achievementList() {
  return ACHIEVEMENTS
}

export function progressPercentForActiveNodes(
  nodes: { id: string; status: string; mastery: number; parent?: string }[]
) {
  const active = new Set(getActiveDomains())
  if (!active.size) return { percent: 0, counted: 0 }

  const relevant = nodes.filter(
    (n) => n.id === 'mind' || active.has(n.id) || (n.parent && active.has(n.parent))
  )
  if (!relevant.length) return { percent: 0, counted: 0 }

  return {
    percent: Math.round(
      relevant.reduce((s, n) => s + (typeof n.mastery === 'number' ? n.mastery : 0), 0) /
        relevant.length
    ),
    counted: relevant.length,
  }
}

/** شناسهٔ پایدار سؤال. سؤال قدیمی حتی بعد از refresh یا روز جدید دوباره قابل XP نیست. */
export function questionFingerprint(value: string) {
  const s = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[؟?!.,،؛:«»"'`]/g, '')

  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `q_${(h >>> 0).toString(36)}`
}

function canonicalQuestionId(id: string) {
  let s = String(id || '').trim()
  if (!s) return ''
  const sessionWrapped = s.match(/^s-[a-z0-9]+-(.+)$/i)
  if (sessionWrapped) s = sessionWrapped[1]
  return s
}

export function hasAnsweredQuestion(g: GameState, id: string) {
  const canonical = canonicalQuestionId(id)
  return Boolean(canonical && g.answeredQuestions.includes(canonical))
}

export function gameXpStatus(g?: GameState | null) {
  const state = g || loadGame()
  const fromToday = state.xpGamesDate === today() ? state.xpFromGamesToday || 0 : 0
  return {
    fromToday,
    cap: DAILY_GAME_XP_CAP,
    remaining: Math.max(0, DAILY_GAME_XP_CAP - fromToday),
    atCap: fromToday >= DAILY_GAME_XP_CAP,
  }
}

export function onQuizQuestionAnswered(
  questionId: string,
  correct: boolean,
  opts?: { domain?: string; xpCorrect?: number; xpWrong?: number }
) {
  const id = canonicalQuestionId(questionId)

  if (!id) {
    return {
      ok: false as const,
      reason: 'already' as const,
      xp: 0,
      gainedXp: 0,
      alreadyAnswered: true,
      atCap: false,
    }
  }

  let g = loadGame()
  if (g.xpGamesDate !== today()) {
    g.xpGamesDate = today()
    g.xpFromGamesToday = 0
  }

  if (g.answeredQuestions.includes(id)) {
    return {
      ok: false as const,
      reason: 'already' as const,
      xp: 0,
      gainedXp: 0,
      alreadyAnswered: true,
      atCap: g.xpFromGamesToday >= DAILY_GAME_XP_CAP,
    }
  }

  // دائمی: دیگر هیچ slice(-300) یا محدودیت 300تایی وجود ندارد.
  g.answeredQuestions = Array.from(new Set([...g.answeredQuestions, id]))

  let gain = correct ? Number(opts?.xpCorrect ?? 5) : Number(opts?.xpWrong ?? 1)
  if (!Number.isFinite(gain) || gain < 0) gain = correct ? 5 : 1

  const from = g.xpFromGamesToday || 0
  if (from >= DAILY_GAME_XP_CAP) gain = correct ? 1 : 0
  else if (from + gain > DAILY_GAME_XP_CAP) gain = Math.max(0, DAILY_GAME_XP_CAP - from)

  g.xp = Math.max(0, g.xp + gain)
  g.xpFromGamesToday = from + gain
  g.level = levelFromXp(g.xp).level

  if (g.missions.daily_quiz) {
    g.missions.daily_quiz.progress = Math.min(
      g.missions.daily_quiz.target,
      g.missions.daily_quiz.progress + 1
    )
  }

  saveGame(g)

  try {
    window.dispatchEvent(new Event('wai-game-updated'))
    bumpFromQuiz(opts?.domain || 'general', correct)
  } catch {}

  return {
    ok: true as const,
    xp: gain,
    gainedXp: gain,
    alreadyAnswered: false,
    correct,
    atCap: g.xpFromGamesToday >= DAILY_GAME_XP_CAP,
    fromToday: g.xpFromGamesToday,
    cap: DAILY_GAME_XP_CAP,
  }
}

export function getWheelChances() {
  try {
    return Math.max(0, Number(localStorage.getItem(WHEEL_CHANCES_KEY) || '0') || 0)
  } catch {
    return 0
  }
}

export function consumeWheelChance() {
  try {
    const available = getWheelChances()
    if (available <= 0) return 0

    const spent = (Number(localStorage.getItem(WHEEL_SPENT_KEY) || '0') || 0) + 1
    localStorage.setItem(WHEEL_SPENT_KEY, String(spent))
    localStorage.setItem(WHEEL_CHANCES_KEY, String(available - 1))
    window.dispatchEvent(new Event('waima-wheel-chances'))
    return available - 1
  } catch {
    return 0
  }
}

/**
 * مهاجرت امن:
 * - شانس موجود فعلی هرگز کم نمی‌شود.
 * - دادهٔ قدیمی waima_wheel_chances حفظ می‌شود.
 * - اگر سطح قبلی نشان دهد شانس‌هایی اصولاً باید وجود می‌داشت، کمبود قابل‌اثبات اضافه می‌شود.
 */
export function ensureWheelChancesBackfill() {
  try {
    const current = getWheelChances()
    const earnedRaw = Number(localStorage.getItem(WHEEL_EARNED_KEY) || '0') || 0
    const spent = Number(localStorage.getItem(WHEEL_SPENT_KEY) || '0') || 0
    const g = loadGame()

    const historicalEarned = Math.max(0, (g.level || 1) - 1)
    const earned = Math.max(earnedRaw, current + spent, historicalEarned)
    const available = Math.max(current, earned - spent)

    localStorage.setItem(WHEEL_EARNED_KEY, String(earned))
    localStorage.setItem(WHEEL_SPENT_KEY, String(spent))
    localStorage.setItem(WHEEL_CHANCES_KEY, String(available))
    window.dispatchEvent(new Event('waima-wheel-chances'))
    return available
  } catch {
    return 0
  }
}
