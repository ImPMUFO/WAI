import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  MAX_PER_HOUR,
  MIN_INTERVAL_MS,
  sanitizeGlobalMessage,
} from '@/lib/chat-safety'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** دیگر پیام‌ها را بعد از ۲۴ ساعت پاک نمی‌کنیم؛ فقط سقف تعداد نگه می‌داریم */
const MESSAGE_LIMIT = 400

function env() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '')
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  return { url, anon, service }
}

/** فقط service role می‌تواند همه پیام‌های قدیمی را پاک کند */
function adminClient() {
  const { url, service, anon } = env()
  if (!url) return null
  const key = service || anon
  if (!key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function clientWithToken(token?: string) {
  const { url, anon } = env()
  if (!url || !anon) return null
  return createClient(url, anon, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function extractToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || ''
}

function cutoffIso() {
  return new Date(0).toISOString()
}

/**
 * حذف فیزیکی پیام‌های قدیمی‌تر از ۲۴ ساعت.
 * اگر SERVICE_ROLE_KEY نباشد، حذف ممکن است به‌خاطر RLS شکست بخورد.
 */
async function purgeOld(): Promise<{ ok: boolean; deleted: number; error?: string; usedService: boolean }> {
  // عمداً غیرفعال: پیام‌های گفتگوی جهانی دیگر خودکار حذف نمی‌شوند
  return { ok: true, deleted: 0, usedService: false }
}

function filterFresh<T extends { created_at?: string }>(rows: T[] | null | undefined): T[] {
  return Array.isArray(rows) ? rows : []
}

export async function GET() {
  const purge = await purgeOld()

  const db = adminClient()
  if (!db) {
    return NextResponse.json(
      { error: 'no supabase', purge },
      { status: 500 }
    )
  }

  const cutoff = new Date(0).toISOString() // unused
  let rows: any[] = []

  const first = await db
    .from('global_messages')
    .select('id, username, body, created_at, user_id, avatar_url')
        .order('created_at', { ascending: true })
    .limit(MESSAGE_LIMIT)

  if (!first.error) {
    rows = first.data || []
  } else {
    const retry = await db
      .from('global_messages')
      .select('id, username, body, created_at, user_id')
            .order('created_at', { ascending: true })
      .limit(MESSAGE_LIMIT)
    if (retry.error) {
      return NextResponse.json({ error: retry.error.message, purge }, { status: 500 })
    }
    rows = retry.data || []
  }

  return NextResponse.json({
    messages: filterFresh(rows),
    purge,
    cutoff,
  })
}

export async function POST(req: NextRequest) {
  const token = extractToken(req)
  if (!token) return NextResponse.json({ error: 'login_required' }, { status: 401 })

  const supabase = clientWithToken(token)
  if (!supabase) return NextResponse.json({ error: 'no supabase' }, { status: 500 })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userErr || !user) return NextResponse.json({ error: 'login_required' }, { status: 401 })

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
      return NextResponse.json({ error: 'کمی صبر کن؛ فاصله بین پیام‌ها کوتاه است.' }, { status: 429 })
    }
    const hourAgo = Date.now() - 60 * 60 * 1000
    const inHour = recent.filter((r) => new Date(r.created_at).getTime() > hourAgo).length
    if (inHour >= MAX_PER_HOUR) {
      return NextResponse.json({ error: 'سقف پیام ساعتی پر شده.' }, { status: 429 })
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const username = (
    profile?.username ||
    profile?.display_name ||
    (user.user_metadata?.username as string) ||
    'user'
  )
    .toString()
    .slice(0, 24)

  const avatar_url =
    profile?.avatar_url ||
    `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(username)}`

  const withAvatar = await supabase
    .from('global_messages')
    .insert({ user_id: user.id, username, body: safe.text, avatar_url })
    .select('id, username, body, created_at, user_id, avatar_url')
    .single()

  const purge = await purgeOld()

  if (!withAvatar.error && withAvatar.data) {
    return NextResponse.json({ message: withAvatar.data, purge })
  }

  const without = await supabase
    .from('global_messages')
    .insert({ user_id: user.id, username, body: safe.text })
    .select('id, username, body, created_at, user_id')
    .single()

  if (without.error) {
    return NextResponse.json({ error: without.error.message, purge }, { status: 500 })
  }

  return NextResponse.json({
    message: { ...without.data, avatar_url },
    purge,
  })
}
