'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Globe2, Send, Pencil, Trash2, Check, X } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { createClient, isSupabaseConfigured, waitForSession } from '@/lib/supabase/client'
import { MAX_BODY, MAX_PER_HOUR, MIN_INTERVAL_MS, sanitizeGlobalMessage } from '@/lib/chat-safety'
import { getSavedAvatar } from '@/lib/avatars'

type Msg = {
  id: string
  username: string
  body: string
  created_at: string
  user_id?: string | null
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

function isMine(m: Msg, myId: string | null, myUsername: string) {
  if (myId && m.user_id && String(m.user_id).toLowerCase() === String(myId).toLowerCase()) {
    return true
  }
  if (myUsername && m.username && String(m.username).toLowerCase() === myUsername.toLowerCase()) {
    return true
  }
  return false
}

export default function WorldChatPage() {
  const { dict, dir } = useLocale()
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [myUsername, setMyUsername] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastSentRef = useRef(0)

  const refreshMe = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoggedIn(false)
      setMyId(null)
      setMyUsername('')
      return null as string | null
    }
    try {
      const supabase = createClient()
      let session = (await supabase.auth.getSession()).data.session
      if (!session?.user) {
        session = await waitForSession(2500)
      }
      const user = session?.user
      if (!user) {
        setLoggedIn(false)
        setMyId(null)
        setMyUsername('')
        return null
      }
      setLoggedIn(true)
      setMyId(user.id)

      let un = String(user.user_metadata?.username || '')
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle()
        if (profile?.username) un = String(profile.username)
      } catch {
        /* ignore */
      }
      setMyUsername(un)
      return user.id
    } catch {
      setLoggedIn(false)
      return null
    }
  }, [])

  const loadFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) return [] as Msg[]
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    let { data, error } = await supabase
      .from('global_messages')
      .select('id, username, body, created_at, user_id, avatar_url')
      .gt('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(200)

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
    return (data as Msg[]) || []
  }, [])

  const load = useCallback(async () => {
    try {
      try {
        await fetch('/api/world', { cache: 'no-store' })
      } catch {
        /* ignore */
      }
      const list = await loadFromSupabase()
      setMessages(list)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'بارگذاری ممکن نشد')
    }
  }, [loadFromSupabase])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await refreshMe()
      if (!alive) return
      await load()
      if (alive) setLoading(false)
    })()

    let unsub: { unsubscribe: () => void } | null = null
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient()
        const { data } = supabase.auth.onAuthStateChange((_e, session) => {
          if (!alive) return
          if (session?.user) {
            setLoggedIn(true)
            setMyId(session.user.id)
            void refreshMe()
          } else {
            setLoggedIn(false)
            setMyId(null)
            setMyUsername('')
          }
        })
        unsub = data.subscription
      } catch {
        /* ignore */
      }
    }

    const t = window.setInterval(() => void load(), 15000)
    return () => {
      alive = false
      window.clearInterval(t)
      unsub?.unsubscribe()
    }
  }, [load, refreshMe])

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
      const uid = await refreshMe()
      if (!uid) {
        setError('برای ارسال پیام وارد حساب شو.')
        return
      }
      const supabase = createClient()
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        setError('برای ارسال پیام وارد حساب شو.')
        return
      }

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

      setMyUsername(username)
      const avatar_url = getSavedAvatar() || profile?.avatar_url || fallbackAvatar(username)

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
        if (without.error) insErr = without.error
        else data = { ...(without.data as Msg), avatar_url, user_id: user.id }
      } else {
        data = { ...(withAvatar.data as Msg), user_id: withAvatar.data?.user_id || user.id }
      }

      if (insErr || !data) {
        setError(insErr?.message || 'ارسال نشد')
        return
      }

      lastSentRef.current = now
      setText('')
      setMessages((m) => [...m, data as Msg])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطا')
    } finally {
      setSending(false)
    }
  }

  const startEdit = (m: Msg) => {
    setEditingId(m.id)
    setEditText(m.body)
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async (id: string) => {
    setError('')
    const safe = sanitizeGlobalMessage(editText)
    if (!safe.ok) {
      setError(safe.error)
      return
    }
    const uid = myId || (await refreshMe())
    if (!uid || !isSupabaseConfigured()) {
      setError('وارد حساب شو.')
      return
    }
    setBusyId(id)
    try {
      const supabase = createClient()
      const { error: upErr } = await supabase
        .from('global_messages')
        .update({ body: safe.text })
        .eq('id', id)
        .eq('user_id', uid)
      if (upErr) {
        setError(
          upErr.message +
            '\nدر Supabase این policy را Run کن:\ncreate policy global_messages_update_own on public.global_messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);'
        )
        return
      }
      setMessages((list) => list.map((m) => (m.id === id ? { ...m, body: safe.text } : m)))
      setEditingId(null)
      setEditText('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ویرایش نشد')
    } finally {
      setBusyId(null)
    }
  }

  const removeMsg = async (id: string) => {
    const uid = myId || (await refreshMe())
    if (!uid || !isSupabaseConfigured()) {
      setError('وارد حساب شو.')
      return
    }
    if (!window.confirm('این پیام حذف شود؟')) return
    setBusyId(id)
    setError('')
    try {
      const supabase = createClient()
      const { error: delErr } = await supabase
        .from('global_messages')
        .delete()
        .eq('id', id)
        .eq('user_id', uid)
      if (delErr) {
        setError(
          delErr.message +
            '\nدر Supabase:\ncreate policy global_messages_delete_own on public.global_messages for delete using (auth.uid() = user_id);'
        )
        return
      }
      setMessages((list) => list.filter((m) => m.id !== id))
      if (editingId === id) cancelEdit()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حذف نشد')
    } finally {
      setBusyId(null)
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
              <p className="text-[10px] text-[var(--muted)]">
                {loggedIn ? `وارد شده‌ای${myUsername ? ` · @${myUsername}` : ''}` : 'مهمان'} · پیام‌ها ۲۴ساعته
              </p>
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

          {messages.map((m) => {
            const mine = isMine(m, myId, myUsername)
            const editing = editingId === m.id
            return (
              <div key={m.id} className="card !py-3 !px-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarFor(m)}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-[var(--border)] bg-[var(--card)] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[var(--accent)] truncate">{m.username}</p>
                      <p className="text-[10px] text-[var(--muted)]">{timeLabel(m.created_at)}</p>
                    </div>
                  </div>
                </div>

                {editing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value.slice(0, MAX_BODY))}
                      rows={3}
                      maxLength={MAX_BODY}
                      className="w-full rounded-xl px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-sm resize-none"
                      style={{ color: 'var(--text)' }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => void saveEdit(m.id)}
                        className="btn-primary px-3 py-2 text-xs inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        ذخیره
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn-secondary px-3 py-2 text-xs inline-flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        انصراف
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>

                    {/* دکمه‌های واضح زیر متن — فقط پیام خودت */}
                    {mine && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          title="ویرایش"
                          disabled={busyId === m.id}
                          onClick={() => startEdit(m)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{
                            color: 'var(--text)',
                            background: 'var(--card-solid)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" strokeWidth={2.25} />
                          ویرایش
                        </button>
                        <button
                          type="button"
                          title="حذف"
                          disabled={busyId === m.id}
                          onClick={() => void removeMsg(m.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{
                            color: 'var(--text)',
                            background: 'var(--card-solid)',
                            borderColor: 'var(--border)',
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.25} />
                          حذف
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-[var(--border)] sticky bottom-0 bg-[var(--bg0)]">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          {!loggedIn && (
            <p className="text-xs text-amber-200/90">
              برای ارسال / ویرایش / حذف{' '}
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
        </div>
      </div>
    </main>
  )
}
