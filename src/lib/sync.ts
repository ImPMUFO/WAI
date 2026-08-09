/**
 * همگام‌سازی WAIMA با Supabase
 * اگر کاربر لاگین نباشد، فقط localStorage استفاده می‌شود.
 */
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export type ChatMessage = { id: number; role: 'user' | 'assistant'; content: string }

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    return data.user ?? null
  } catch {
    return null
  }
}

export async function signOut() {
  if (!isSupabaseConfigured()) return
  const supabase = createClient()
  await supabase.auth.signOut()
}

/** ذخیره/به‌روزرسانی پروفایل سبک */
export async function upsertProfilePatch(patch: {
  display_name?: string
  locale?: string
  theme?: string
  xp?: number
  level?: number
  streak?: number
  game_state?: unknown
  bio?: string
  avatar_url?: string
}) {
  const user = await getCurrentUser()
  if (!user) return { ok: false as const, reason: 'no-user' }
  const supabase = createClient()
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )
  if (error) return { ok: false as const, reason: error.message }
  return { ok: true as const }
}

/** همگام XP از localStorage به سرور */
export async function syncGameStateToServer(gameState: unknown, xp?: number, level?: number, streak?: number) {
  let display_name: string | undefined
  try {
    display_name = localStorage.getItem('wai_user_name') || localStorage.getItem('waima_user_name') || undefined
  } catch {
    display_name = undefined
  }
  return upsertProfilePatch({
    game_state: gameState,
    xp,
    level,
    streak,
    ...(display_name ? { display_name } : {}),
  })
}

export type LeaderboardRow = {
  display_name: string | null
  xp: number | null
  level: number | null
}

/** جدول امتیازات عمومی (نیاز به policy خواندن profiles) */
export async function fetchLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  try {
    if (!isSupabaseConfigured()) return []
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, xp, level')
      .order('xp', { ascending: false })
      .limit(limit)
    if (error || !data) {
      console.warn('leaderboard', error?.message)
      return []
    }
    return data as LeaderboardRow[]
  } catch (e) {
    console.warn('leaderboard', e)
    return []
  }
}


/** ذخیره نقشه ذهن یکپارچه */
export async function saveMindMapToServer(map: {
  summary?: string
  nodes: unknown
  domainTitle?: string
  updatedAt?: string
}) {
  const user = await getCurrentUser()
  if (!user) return { ok: false as const, reason: 'no-user' }
  const supabase = createClient()
  const { error } = await supabase.from('mind_maps').upsert(
    {
      user_id: user.id,
      map_key: 'unified',
      summary: map.summary || map.domainTitle || '',
      nodes: map.nodes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,map_key' }
  )
  if (error) return { ok: false as const, reason: error.message }
  return { ok: true as const }
}

/** خواندن نقشه از سرور */
export async function loadMindMapFromServer() {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = createClient()
  const { data, error } = await supabase
    .from('mind_maps')
    .select('summary, nodes, updated_at')
    .eq('user_id', user.id)
    .eq('map_key', 'unified')
    .maybeSingle()
  if (error || !data) return null
  return {
    domain: 'unified',
    domainTitle: 'نقشه کامل ذهن',
    summary: data.summary || '',
    updatedAt: data.updated_at,
    nodes: data.nodes,
  }
}

/**
 * ذخیره گفتگوی یک حوزه:
 * conversation را پیدا/می‌سازد و پیام‌ها را جایگزین می‌کند (ساده و قابل اعتماد)
 */
export async function saveConversationToServer(domain: string, messages: ChatMessage[], title?: string) {
  const user = await getCurrentUser()
  if (!user) return { ok: false as const, reason: 'no-user' }
  if (!messages.length) return { ok: true as const }

  const supabase = createClient()

  // پیدا کردن یا ساخت مکالمه
  let convId: string | null = null
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', user.id)
    .eq('domain', domain)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    convId = existing.id
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString(), title: title || domain })
      .eq('id', convId)
  } else {
    const { data: created, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        domain,
        title: title || domain,
      })
      .select('id')
      .single()
    if (error || !created) return { ok: false as const, reason: error?.message || 'create-failed' }
    convId = created.id
  }

  // هرگز با آرایه خالی یا کوتاه‌تر از قبل، تاریخچه را نابود نکن
  if (!messages.length) {
    return { ok: false as const, reason: 'empty-messages-refused' }
  }

  const { count: existingCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', convId)

  if (typeof existingCount === 'number' && existingCount > messages.length) {
    // نسخهٔ سرور غنی‌تر است — بازنویسی مخرب ممنوع
    return { ok: false as const, reason: 'server-has-more-messages' }
  }

  // جایگزینی ایمن فقط وقتی دادهٔ جدید کامل‌تر یا مساوی است
  await supabase.from('messages').delete().eq('conversation_id', convId)

  const rows = messages.map((m) => ({
    conversation_id: convId!,
    user_id: user.id,
    role: m.role,
    content: m.content,
  }))

  const { error: msgErr } = await supabase.from('messages').insert(rows)
  if (msgErr) return { ok: false as const, reason: msgErr.message }
  return { ok: true as const, conversationId: convId }
}

/** بارگذاری گفتگوی یک حوزه از سرور */
export async function loadConversationFromServer(domain: string): Promise<ChatMessage[] | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const supabase = createClient()

  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', user.id)
    .eq('domain', domain)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!conv?.id) return null

  const { data: msgs } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })

  if (!msgs?.length) return null

  return msgs.map((m, i) => ({
    id: i + 1,
    role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: m.content,
  }))
}

/** بعد از لاگین: local → server برای نقشه و game */

/** آرشیو محلی گفتگو — هیچ‌وقت پاک نمی‌شود */
export function archiveLocalChat(domain: string, messages: ChatMessage[]) {
  if (typeof window === 'undefined' || !messages?.length) return
  try {
    const key = `wai_chat_archive_${domain}_${Date.now()}`
    localStorage.setItem(key, JSON.stringify({ domain, savedAt: new Date().toISOString(), messages }))
    // فهرست آرشیوها
    const idxKey = 'wai_chat_archive_index'
    const raw = localStorage.getItem(idxKey)
    const idx: string[] = raw ? JSON.parse(raw) : []
    idx.push(key)
    localStorage.setItem(idxKey, JSON.stringify(idx.slice(-200)))
  } catch {
    /* quota */
  }
}

/** بازیابی بهترین گفتگوی موجود برای یک حوزه (محلی + آرشیو + سرور) */
export async function recoverConversation(domain: string): Promise<ChatMessage[] | null> {
  let best: ChatMessage[] = []
  try {
    const cur = localStorage.getItem(`wai_chat_${domain}`)
    if (cur) {
      const parsed = JSON.parse(cur)
      if (Array.isArray(parsed) && parsed.length > best.length) best = parsed
    }
  } catch {}
  try {
    const idxRaw = localStorage.getItem('wai_chat_archive_index')
    const idx: string[] = idxRaw ? JSON.parse(idxRaw) : []
    for (const k of idx) {
      if (!k.includes(`_${domain}_`) && !k.includes(`wai_chat_archive_${domain}_`)) continue
      try {
        const a = JSON.parse(localStorage.getItem(k) || 'null')
        const msgs = a?.messages
        if (Array.isArray(msgs) && msgs.length > best.length) best = msgs
      } catch {}
    }
    // اسکن همه کلیدها برای آرشیوهای قدیمی
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || ''
      if (k.startsWith('wai_chat_archive_') && k.includes(domain)) {
        try {
          const a = JSON.parse(localStorage.getItem(k) || 'null')
          const msgs = a?.messages
          if (Array.isArray(msgs) && msgs.length > best.length) best = msgs
        } catch {}
      }
    }
  } catch {}
  const remote = await loadConversationFromServer(domain)
  if (remote && remote.length > best.length) best = remote
  if (best.length) {
    try {
      localStorage.setItem(`wai_chat_${domain}`, JSON.stringify(best))
    } catch {}
    // اگر سرور کوتاه‌تر بود، دوباره بالا بفرست
    if (!remote || remote.length < best.length) {
      void saveConversationToServer(domain, best)
    }
  }
  return best.length ? best : null
}

/** مهاجرت همه داده‌های محلی به سرور بعد از ورود */
export async function recoverAllLocalDataToServer() {
  const user = await getCurrentUser()
  if (!user) return
  try {
    // نقشه
    const mapRaw = localStorage.getItem('wai_map_unified')
    if (mapRaw) {
      const map = JSON.parse(mapRaw)
      if (map?.nodes?.length) await saveMindMapToServer(map)
    }
  } catch {}
  try {
    // بازی
    const gRaw = localStorage.getItem('wai_game_state_v1')
    if (gRaw) {
      const g = JSON.parse(gRaw)
      await syncGameStateToServer(g, g.xp, g.level, g.streak)
    }
  } catch {}
  try {
    // همه گفتگوهای فعلی
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || ''
      if (k.startsWith('wai_chat_') && !k.includes('archive')) {
        const domain = k.replace('wai_chat_', '')
        try {
          const msgs = JSON.parse(localStorage.getItem(k) || '[]')
          if (Array.isArray(msgs) && msgs.length) await saveConversationToServer(domain, msgs)
        } catch {}
      }
    }
  } catch {}
}

export async function migrateLocalToServerIfNeeded() {
  await recoverEverything()
}


/** بازیابی کامل از سرور: همه گفتگوها + نقشه + بازی */
export async function recoverEverything() {
  const user = await getCurrentUser()
  if (!user) {
    // بدون لاگین فقط از local/آرشیو کمک بگیر
    return { ok: false as const, reason: 'no-user' }
  }
  const supabase = createClient()

  // 1) نقشه
  try {
    const remoteMap = await loadMindMapFromServer()
    if (remoteMap && Array.isArray((remoteMap as any).nodes) && (remoteMap as any).nodes.length) {
      try {
        const localRaw = localStorage.getItem('wai_map_unified')
        const local = localRaw ? JSON.parse(localRaw) : null
        // نگه داشتن غنی‌تر
        const remoteNodes = (remoteMap as any).nodes as any[]
        const localNodes = Array.isArray(local?.nodes) ? local.nodes : []
        const byId = new Map<string, any>()
        for (const n of localNodes) if (n?.id) byId.set(n.id, n)
        for (const n of remoteNodes) {
          if (!n?.id) continue
          const prev = byId.get(n.id)
          if (!prev) byId.set(n.id, n)
          else {
            byId.set(n.id, {
              ...prev,
              ...n,
              mastery: Math.max(Number(prev.mastery) || 0, Number(n.mastery) || 0),
              status: [prev.status, n.status].includes('known')
                ? 'known'
                : [prev.status, n.status].includes('near')
                  ? 'near'
                  : n.status || prev.status,
            })
          }
        }
        // mind node
        if (![...byId.keys()].includes('mind')) {
          byId.set('mind', {
            id: 'mind',
            title: 'ذهن',
            status: 'known',
            mastery: 50,
            note: 'مرکز نقشه',
          })
        }
        const merged = {
          domain: 'unified',
          domainTitle: (remoteMap as any).domainTitle || local?.domainTitle || 'نقشه کامل ذهن',
          summary: (remoteMap as any).summary || local?.summary || '',
          updatedAt: new Date().toISOString(),
          nodes: Array.from(byId.values()),
        }
        localStorage.setItem('wai_map_unified', JSON.stringify(merged))
        await saveMindMapToServer(merged)
        window.dispatchEvent(new Event('wai-map-updated'))
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }

  // 2) همه گفتگوها از سرور
  try {
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, domain, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    for (const c of convs || []) {
      if (!c?.domain || !c?.id) continue
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: true })
      if (!msgs?.length) continue
      const mapped = msgs.map((m, i) => ({
        id: i + 1,
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      }))
      const key = `wai_chat_${c.domain}`
      try {
        const prevRaw = localStorage.getItem(key)
        const prev = prevRaw ? JSON.parse(prevRaw) : []
        // هرگز کوتاه‌تر را جایگزین نکن
        if (Array.isArray(prev) && prev.length > mapped.length) {
          await saveConversationToServer(c.domain, prev, c.title || c.domain)
        } else {
          localStorage.setItem(key, JSON.stringify(mapped))
        }
      } catch {
        localStorage.setItem(key, JSON.stringify(mapped))
      }
    }
  } catch {
    /* ignore */
  }

  // 3) بازی / XP از پروفایل
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, xp, level, streak, game_state')
      .eq('id', user.id)
      .maybeSingle()
    if (profile) {
      if (profile.display_name) {
        try {
          localStorage.setItem('wai_user_name', profile.display_name)
        } catch {}
      }
      try {
        const raw = localStorage.getItem('wai_game_state_v1')
        const localG = raw ? JSON.parse(raw) : null
        const remoteXp = Number(profile.xp) || 0
        const localXp = Number(localG?.xp) || 0
        if (profile.game_state && typeof profile.game_state === 'object') {
          const gs = profile.game_state as any
          if (!localG || remoteXp >= localXp) {
            localStorage.setItem(
              'wai_game_state_v1',
              JSON.stringify({
                ...localG,
                ...gs,
                xp: Math.max(remoteXp, localXp, Number(gs.xp) || 0),
                level: Math.max(Number(profile.level) || 1, Number(localG?.level) || 1, Number(gs.level) || 1),
              })
            )
          }
        } else if (remoteXp > localXp) {
          const base = localG || {
            xp: 0,
            level: 1,
            totalMessages: 0,
            totalQuizzes: 0,
            streak: 0,
            lastActiveDate: '',
            achievements: [],
            missions: {},
            history: [],
            answeredQuestions: [],
          }
          base.xp = remoteXp
          base.level = Number(profile.level) || base.level
          localStorage.setItem('wai_game_state_v1', JSON.stringify(base))
        }
        window.dispatchEvent(new Event('wai-game-updated'))
      } catch {}
    }
  } catch {
    /* ignore */
  }

  // 4) آپلود باقی‌مانده محلی
  await recoverAllLocalDataToServer()
  return { ok: true as const }
}
