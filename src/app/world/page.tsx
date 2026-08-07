'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Globe2, Send } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { createClient, isSupabaseConfigured, waitForSession } from '@/lib/supabase/client'
import { MAX_BODY, MAX_PER_HOUR, MIN_INTERVAL_MS, sanitizeGlobalMessage } from '@/lib/chat-safety'
import { getSavedAvatar } from '@/lib/avatars'

type Msg = {
  id: string
  username: string
  body: string
  created_at: string
  user_id?: string
  avatar_url?: string | null
}

function fallbackAvatar(seed: string) {
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed || 'user')}`
}

function avatarFor(m: Msg) {
  if (m.avatar_url) return m.avatar_url
  return fallbackAvatar(m.username || m.user_id || 'user')
}

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function WorldChatPage() {
  const { dict, dir } = useLocale()
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastSentRef = useRef(0)

  /** بارگذاری پیام‌ها — بدون وابستگی اجباری به ستون avatar_url */
  const loadFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) return [] as Msg[]
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // اول با avatar_url
    let { data, error } = await supabase
      .from('global_messages')
      .select('id, username, body, created_at, user_id, avatar_url')
      .gt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(200)

    // اگر ستون نبود، بدون avatar_url
    if (error) {
      const retry = await supabase
        .from('global_messages')
        .select('id, username, body, created_at, user_id')
        .gt('created_at', cutoff)
        .order('created_at', { ascending: true })
        .limit(200)
      data = retry.data as any
      error = retry.error
    }

    if (error) throw new Error(error.message)

    let list = (data as Msg[]) || []

    // پر کردن عکس از profiles اگر خالی بود
    const need = [...new Set(list.filter((m) => !m.avatar_url && m.user_id).map((m) => m.user_id!))]
    if (need.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_url, username')
        .in('id', need)
      const map = new Map((profiles || []).map((p: any) => [p.id, p]))
      list = list.map((m) => {
        if (m.avatar_url || !m.user_id) return m
        const p = map.get(m.user_id)
        return {
          ...m,
          avatar_url: p?.avatar_url || null,
          username: m.username || p?.username || m.username,
        }
      })
    }

    return list
  }, [])

  const load = useCallback(async () => {
    try {
      // API فقط برای purge؛ اگر شکست خورد مستقیم Supabase
      try {
        await fetch('/api/world', { cache: 'no-store' })
      } catch {
        /* ignore */
      }
      const list = await loadFromSupabase()
      setMessages(list)
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'بارگذاری پیام‌ها ممکن نشد')
    }
  }, [loadFromSupabase])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (isSupabaseConfigured()) {
        const session = await waitForSession(1500)
        if (alive) setLoggedIn(Boolean(session?.user))
      }
      await load()
      if (alive) setLoading(false)
    })()
    const t = window.setInterval(() => void load(), 12000)
    return () => {
      alive = false
      window.clearInterval(t)
    }
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    setError('')
    if (!text.trim()) return
    if (!isSupabaseConfigured()) {
      setError('اتصال در دسترس نیست.')
      return
    }
    setSending(true)
    try {
      const supabase = createClient()
      let session = (await supabase.auth.getSession()).data.session
      if (!session?.user) session = await waitForSession(2000)
      const user = session?.user
      if (!user) {
        setLoggedIn(false)
        setError('برای ارسال پیام وارد حساب شو.')
        return
      }
      setLoggedIn(true)

      const now = Date.now()
      if (now - lastSentRef.current < MIN_INTERVAL_MS) {
        setError('کمی صبر کن؛ فاصله بین پیام‌ها کوتاه است.')
        return
      }

      const safe = sanitizeGlobalMessage(text)
      if (!safe.ok) {
        setError(safe.error)
        return
      }

      const hourAgo = new Date(now - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('global_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('created_at', hourAgo)
      if ((count || 0) >= MAX_PER_HOUR) {
        setError('سقف پیام ساعتی پر شده.')
        return
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

      const avatar_url = getSavedAvatar() || profile?.avatar_url || fallbackAvatar(username)

      // ذخیره روی پروفایل (اختیاری)
      try {
        await supabase.from('profiles').upsert({
          id: user.id,
          avatar_url,
          username: profile?.username || username,
          updated_at: new Date().toISOString(),
        })
      } catch {
        /* ignore */
      }

      // درج پیام: اول با avatar_url، اگر ستون نبود بدون آن
      let data: Msg | null = null
      let insErr: { message: string } | null = null

      const withAvatar = await supabase
        .from('global_messages')
        .insert({ user_id: user.id, username, body: safe.text, avatar_url })
        .select('id, username, body, created_at, user_id, avatar_url')
        .single()

      if (withAvatar.error) {
        const without = await supabase
          .from('global_messages')
          .insert({ user_id: user.id, username, body: safe.text })
          .select('id, username, body, created_at, user_id')
          .single()
        if (without.error) {
          insErr = without.error
        } else {
          data = { ...(without.data as Msg), avatar_url }
        }
      } else {
        data = withAvatar.data as Msg
      }

      if (insErr || !data) {
        setError(insErr?.message || 'ارسال نشد. اگر تازه ستون avatar را زدی، یک‌بار صفحه را رفرش کن.')
        return
      }

      lastSentRef.current = now
      setText('')
      setMessages((m) => [...m, data as Msg])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته')
    } finally {
      setSending(false)
    }
  }

  return (
    <main dir={dir} className="min-h-screen flex flex-col" style={{ color: 'var(--text)' }}>
      <header className="border-b border-[var(--border)] sticky top-0 z-20 backdrop-blur-md bg-[color-mix(in_srgb,var(--bg0)_88%,transparent)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Globe2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold truncate">گفتگوی جهانی</h1>
              <p className="text-[10px] text-[var(--muted)]">پیام‌ها هر ۲۴ ساعت پاک می‌شوند · فقط متن</p>
            </div>
          </div>
          <Link href="/" className="text-sm text-[var(--muted)] inline-flex items-center gap-1 shrink-0">
            <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            {dict.home}
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 min-h-[50vh]">
          {loading && <p className="text-sm text-[var(--muted)] text-center">…</p>}
          {!loading && messages.length === 0 && !error && (
            <p className="text-sm text-[var(--muted)] text-center py-10">هنوز پیامی نیست. اولین نفر باش.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="card !py-2.5 !px-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarFor(m)}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-[var(--accent)]/40 bg-[var(--card)] shrink-0"
                  />
                  <span className="text-xs font-mono text-[var(--accent)] truncate">{m.username}</span>
                </div>
                <span className="text-[10px] text-[var(--muted)] shrink-0">{timeLabel(m.created_at)}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-[var(--border)] sticky bottom-0 bg-[var(--bg0)]">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          {!loggedIn && (
            <p className="text-xs text-amber-200/90">
              برای ارسال پیام{' '}
              <Link href="/auth" className="text-[var(--accent)] underline">
                وارد شو
              </Link>
              .
            </p>
          )}
          {error && <p className="text-xs text-rose-300 whitespace-pre-wrap">{error}</p>}
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_BODY))}
              rows={2}
              maxLength={MAX_BODY}
              placeholder="پیام متنی… (بدون لینک)"
              className="flex-1 rounded-xl px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-sm resize-none"
              style={{ color: 'var(--text)' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <button
              type="button"
              disabled={sending || !text.trim()}
              onClick={() => void send()}
              className="btn-primary px-3 py-2.5 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-[var(--muted)]">
            {text.length}/{MAX_BODY} · بدون لینک · بدون کد
          </p>
        </div>
      </div>
    </main>
  )
}
