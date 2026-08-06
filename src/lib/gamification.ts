/** سیستم گیمیفیکیشن WAI – ذخیره در localStorage */

export const GAME_KEY = 'wai_game_state_v1'
export const ACTIVE_DOMAINS_KEY = 'wai_active_domains'

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
  lastActiveDate: string // YYYY-MM-DD
  achievements: AchievementId[]
  missions: Record<
    MissionId,
    { progress: number; target: number; claimed: boolean; resetAt: string }
  >
  history: { ts: number; reason: string; xp: number }[]
  /** id سؤالاتی که یک‌بار پاسخ داده شده‌اند (XP تکراری ممنوع) */
  answeredQuestions: string[]
}

/** حداکثر سطح فعلی */
export const MAX_LEVEL = 20

/**
 * XP لازم برای رفتن از سطح `level` به سطح بعد.
 * الگو: سطح1→2 = 50، 2→3 = 100، 3→4 = 150، ... = 50 * level
 * مجموع برای رسیدن به سطح L: 50 * (L-1)*L/2
 * L2=50, L3=150, L4=300, L5=500, ...
 */
export function xpForLevel(level: number) {
  if (level < 1) return 50
  if (level >= MAX_LEVEL) return 0
  return 50 * level
}

/** مجموع XP لازم برای رسیدن به ابتدای یک سطح (سطح 1 = 0) */
export function totalXpForLevel(level: number) {
  const L = Math.max(1, Math.min(level, MAX_LEVEL))
  // sum 50*k for k=1..L-1 = 50*(L-1)*L/2
  return (50 * (L - 1) * L) / 2
}

export function levelFromXp(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp || 0))
  let level = 1
  let remain = safeXp
  while (level < MAX_LEVEL) {
    const need = xpForLevel(level)
    if (remain < need) {
      return { level, intoLevel: remain, need, remaining: need - remain }
    }
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
  }
}

export function loadGame(): GameState {
  if (typeof window === 'undefined') return defaultGameState()
  try {
    const raw = localStorage.getItem(GAME_KEY)
    if (!raw) return defaultGameState()
    const parsed = JSON.parse(raw) as GameState
    return normalizeGame(parsed)
  } catch {
    return defaultGameState()
  }
}

function normalizeGame(g: GameState): GameState {
  const base = defaultGameState()
  const missions = { ...base.missions, ...(g.missions || {}) }
  const t = today()
  // ریست روزانه
  ;(['daily_chat', 'daily_quiz'] as MissionId[]).forEach((id) => {
    if (missions[id].resetAt !== t) {
      missions[id] = { ...missions[id], progress: 0, claimed: false, resetAt: t }
    }
  })
  // ریست هفتگی ساده: اگر بیش از ۷ روز
  ;(['weekly_domains', 'weekly_messages'] as MissionId[]).forEach((id) => {
    const start = missions[id].resetAt
    if (start < addDays(t, -7)) {
      missions[id] = { ...missions[id], progress: 0, claimed: false, resetAt: t }
    }
  })
  return {
    ...base,
    ...g,
    missions,
    achievements: Array.isArray(g.achievements) ? g.achievements : [],
    history: Array.isArray(g.history) ? g.history.slice(-40) : [],
    answeredQuestions: Array.isArray(g.answeredQuestions) ? g.answeredQuestions : [],
  }
}

export function saveGame(g: GameState) {
  localStorage.setItem(GAME_KEY, JSON.stringify(g))
  window.dispatchEvent(new Event('wai-game-updated'))
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

export function getActiveDomains(): string[] {
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

function grantAchievement(g: GameState, id: AchievementId): GameState {
  if (g.achievements.includes(id)) return g
  const meta = ACHIEVEMENTS[id]
  const next = {
    ...g,
    achievements: [...g.achievements, id],
    xp: g.xp + meta.xp,
    history: [{ ts: Date.now(), reason: `مدال: ${meta.title}`, xp: meta.xp }, ...g.history].slice(0, 40),
  }
  return next
}

function touchStreak(g: GameState): GameState {
  const t = today()
  if (g.lastActiveDate === t) return g
  let streak = 1
  if (g.lastActiveDate && g.lastActiveDate === addDays(t, -1)) {
    streak = g.streak + 1
  }
  return { ...g, streak, lastActiveDate: t }
}

export function addXp(g: GameState, amount: number, reason: string): GameState {
  const leveled = levelFromXp(g.xp)
  let next: GameState = {
    ...g,
    xp: g.xp + amount,
    history: [{ ts: Date.now(), reason, xp: amount }, ...g.history].slice(0, 40),
  }
  next = touchStreak(next)
  const after = levelFromXp(next.xp)
  next.level = after.level
  if (after.level > leveled.level) {
    next.history = [
      { ts: Date.now(), reason: `ارتقا به سطح ${after.level}`, xp: 0 },
      ...next.history,
    ].slice(0, 40)
  }
  return next
}

export function onChatMessage(domain: string): GameState {
  markDomainActive(domain)
  let g = loadGame()
  g = touchStreak(g)
  g.totalMessages += 1
  g = addXp(g, 8, 'پیام در گفتگو')

  // مأموریت‌ها
  g.missions.daily_chat.progress = Math.min(
    g.missions.daily_chat.target,
    g.missions.daily_chat.progress + 1
  )
  g.missions.weekly_messages.progress = Math.min(
    g.missions.weekly_messages.target,
    g.missions.weekly_messages.progress + 1
  )
  const domains = getActiveDomains()
  g.missions.weekly_domains.progress = Math.min(g.missions.weekly_domains.target, domains.length)

  if (g.totalMessages >= 1) g = grantAchievement(g, 'first_chat')
  if (g.totalMessages >= 10) g = grantAchievement(g, 'ten_messages')
  if (g.totalMessages >= 50) g = grantAchievement(g, 'fifty_messages')
  if (domains.length >= 3) g = grantAchievement(g, 'three_domains')
  if (g.streak >= 7) g = grantAchievement(g, 'seven_day_streak')

  const hour = new Date().getHours()
  if (hour >= 0 && hour < 5) g = grantAchievement(g, 'night_owl')

  // پاداش اتمام مأموریت روزانه چت
  if (
    g.missions.daily_chat.progress >= g.missions.daily_chat.target &&
    !g.missions.daily_chat.claimed
  ) {
    g.missions.daily_chat.claimed = true
    g = addXp(g, 25, 'مأموریت روزانه گفتگو')
  }

  saveGame(g)
  return g
}

export function onMapUpdated(): GameState {
  let g = loadGame()
  g = addXp(g, 12, 'به‌روزرسانی نقشه ذهن')
  g = grantAchievement(g, 'first_map')
  saveGame(g)
  return g
}

export function onQuizFinished(scoreRatio: number): GameState {
  let g = loadGame()
  g.totalQuizzes += 1
  const xp = 15 + Math.round(scoreRatio * 25)
  g = addXp(g, xp, 'اتمام بازی آموزشی')
  g.missions.daily_quiz.progress = Math.min(
    g.missions.daily_quiz.target,
    g.missions.daily_quiz.progress + 1
  )
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

/** درصد پیشرفت فقط روی حوزه‌های فعال */
export function progressPercentForActiveNodes(
  nodes: { id: string; status: string; mastery: number; parent?: string }[]
) {
  const active = new Set(getActiveDomains())
  // اگر هنوز هیچ حوزه‌ای فعال نیست
  if (active.size === 0) return { percent: 0, counted: 0 }

  const relevant = nodes.filter((n) => {
    if (n.id === 'mind') return true
    // گره ریشه حوزه یا فرزند حوزه‌های فعال
    if (active.has(n.id)) return true
    // اگر parent مستقیم حوزه فعال است
    if (n.parent && active.has(n.parent)) return true
    return false
  })

  if (!relevant.length) return { percent: 0, counted: 0 }
  const avg =
    relevant.reduce((s, n) => s + (typeof n.mastery === 'number' ? n.mastery : 0), 0) /
    relevant.length
  return { percent: Math.round(avg), counted: relevant.length }
}


export function hasAnsweredQuestion(g: GameState, id: string) {
  return (g.answeredQuestions || []).includes(id)
}

/** ثبت پاسخ یک سؤال؛ فقط بار اول XP می‌دهد */
export function onQuizQuestionAnswered(
  questionId: string,
  correct: boolean,
  opts?: { xpCorrect?: number; xpWrong?: number }
): { state: GameState; alreadyAnswered: boolean; gainedXp: number } {
  let g = loadGame()
  g = touchStreak(g)
  if (!g.answeredQuestions) g.answeredQuestions = []
  if (g.answeredQuestions.includes(questionId)) {
    return { state: g, alreadyAnswered: true, gainedXp: 0 }
  }
  const before = g.xp
  g.answeredQuestions = [...g.answeredQuestions, questionId]
  g.totalQuizzes += 1
  const xpC = opts?.xpCorrect ?? 5
  const xpW = opts?.xpWrong ?? 0
  g = addXp(g, correct ? xpC : xpW, correct ? 'پاسخ درست بازی' : 'تلاش در بازی')
  if (g.totalQuizzes >= 10) g = grantAchievement(g, 'quiz_master')
  const m = { ...g.missions }
  if (m.daily_quiz && !m.daily_quiz.claimed) {
    m.daily_quiz = {
      ...m.daily_quiz,
      progress: Math.min(m.daily_quiz.target, m.daily_quiz.progress + 1),
    }
    if (m.daily_quiz.progress >= m.daily_quiz.target) {
      m.daily_quiz.claimed = true
      g = addXp(g, 20, 'مأموریت روزانه آزمون')
    }
  }
  g.missions = m
  // level از xp
  const lv = levelFromXp(g.xp)
  g.level = lv.level
  saveGame(g)
  return { state: g, alreadyAnswered: false, gainedXp: g.xp - before }
}
