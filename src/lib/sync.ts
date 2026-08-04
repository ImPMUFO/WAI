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
  return upsertProfilePatch({
    game_state: gameState,
    xp,
    level,
    streak,
  })
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

  // پاک کردن پیام‌های قبلی این مکالمه و نوشتن دوباره (ساده)
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
export async function migrateLocalToServerIfNeeded() {
  const user = await getCurrentUser()
  if (!user) return

  try {
    const mapRaw = localStorage.getItem('wai_map_unified')
    if (mapRaw) {
      const map = JSON.parse(mapRaw)
      await saveMindMapToServer(map)
    }
  } catch {
    /* ignore */
  }

  try {
    const gameRaw = localStorage.getItem('wai_game_state_v1')
    if (gameRaw) {
      const g = JSON.parse(gameRaw)
      await syncGameStateToServer(g, g.xp, g.level, g.streak)
    }
  } catch {
    /* ignore */
  }
}
