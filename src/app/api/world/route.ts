import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  MAX_PER_HOUR,
  MIN_INTERVAL_MS,
  sanitizeGlobalMessage,
} from '@/lib/chat-safety'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function env() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '')
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  return { url, anon, service }
}

function clientWithToken(token?: string) {
  const { url, anon } = env()
  if (!url || !anon) return null
  return createClient(url, anon, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function adminClient() {
  const { url, anon, service } = env()
  const key = service || anon
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function extractToken(req: NextRequest) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || ''
}

async function purge() {
  const db = adminClient()
  if (!db) return
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await db.from('global_messages').delete().lt('created_at', cutoff)
}

export async function GET() {
  const db = adminClient()
  if (!db) return NextResponse.json({ error: 'no supabase' }, { status: 500 })
  try {
    await purge()
  } catch {
    /* ignore */
  }
  const { data, error } = await db
    .from('global_messages')
    .select('id, username, body, created_at, user_id, avatar_url')
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data || [] })
}

export async function POST(req: NextRequest) {
  const token = extractToken(req)
  if (!token) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 })
  }

  const supabase = clientWithToken(token)
  if (!supabase) return NextResponse.json({ error: 'no supabase' }, { status: 500 })

  // مهم: JWT را صریح بده تا user شناخته شود
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) {
    return NextResponse.json({ error: 'login_required' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const safe = sanitizeGlobalMessage(String(body?.text || ''))
  if (!safe.ok) return NextResponse.json({ error: safe.error }, { status: 400 })

  const { data: recent } = await supabase
    .from('global_messages')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_PER_HOUR)

  if (recent?.length) {
    const last = new Date(recent[0].created_at).getTime()
    if (Date.now() - last < MIN_INTERVAL_MS) {
      return NextResponse.json(
        { error: 'کمی صبر کن؛ فاصله بین پیام‌ها کوتاه است.' },
        { status: 429 }
      )
    }
    const hourAgo = Date.now() - 60 * 60 * 1000
    const inHour = recent.filter((r) => new Date(r.created_at).getTime() > hourAgo).length
    if (inHour >= MAX_PER_HOUR) {
      return NextResponse.json({ error: 'سقف پیام ساعتی پر شده.' }, { status: 429 })
    }
  }

  let username = 'user'
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .maybeSingle()
  username = (
    profile?.username ||
    profile?.display_name ||
    (user.user_metadata?.username as string) ||
    'user'
  )
    .toString()
    .slice(0, 24)

  const { data, error } = await supabase
    .from('global_messages')
    .insert({
      user_id: user.id,
      username,
      body: safe.text,
    })
    .select('id, username, body, created_at, user_id, avatar_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await purge()
  } catch {
    /* ignore */
  }

  return NextResponse.json({ message: data })
}
