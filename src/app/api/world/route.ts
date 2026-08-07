import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  MAX_PER_HOUR,
  MIN_INTERVAL_MS,
  sanitizeGlobalMessage,
} from '@/lib/chat-safety'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function adminOrAnon() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key =
    (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() ||
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function userClient(req: NextRequest) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  if (!url || !key) return null
  const auth = req.headers.get('authorization') || ''
  return createClient(url, key, {
    global: { headers: auth ? { Authorization: auth } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function purge(db: ReturnType<typeof createClient>) {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  await db.from('global_messages').delete().lt('created_at', cutoff)
}

/** لیست پیام‌های ۲۴ ساعت اخیر */
export async function GET() {
  const db = adminOrAnon()
  if (!db) return NextResponse.json({ error: 'no supabase' }, { status: 500 })
  try {
    await purge(db)
  } catch {
    /* ignore */
  }
  const { data, error } = await db
    .from('global_messages')
    .select('id, username, body, created_at, user_id')
    .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ messages: data || [] })
}

/** ارسال پیام */
export async function POST(req: NextRequest) {
  const dbUser = userClient(req)
  if (!dbUser) return NextResponse.json({ error: 'no supabase' }, { status: 500 })

  const {
    data: { user },
  } = await dbUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const safe = sanitizeGlobalMessage(String(body?.text || ''))
  if (!safe.ok) return NextResponse.json({ error: safe.error }, { status: 400 })

  // محدودیت نرخ
  const { data: recent } = await dbUser
    .from('global_messages')
    .select('created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_PER_HOUR)

  if (recent && recent.length) {
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

  // نام نمایشی
  let username = 'user'
  const { data: profile } = await dbUser
    .from('profiles')
    .select('username, display_name')
    .eq('id', user.id)
    .maybeSingle()
  username =
    (profile?.username || profile?.display_name || user.email?.split('@')[0] || 'user')
      .toString()
      .slice(0, 24)

  const { data, error } = await dbUser
    .from('global_messages')
    .insert({
      user_id: user.id,
      username,
      body: safe.text,
    })
    .select('id, username, body, created_at, user_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // پاکسازی فرصت‌طلبانه
  const admin = adminOrAnon()
  if (admin) {
    try {
      await purge(admin)
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ message: data })
}
