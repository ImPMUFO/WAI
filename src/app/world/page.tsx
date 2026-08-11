'use client'

const WORLD_ROOMS = [
  { id: 'general', fa: 'عمومی', en: 'General', emoji: '💬' },
  { id: 'philosophy', fa: 'فلسفه', en: 'Philosophy', emoji: '🧠' },
  { id: 'history', fa: 'تاریخ', en: 'History', emoji: '📜' },
  { id: 'science', fa: 'علم', en: 'Science', emoji: '🔬' },
  { id: 'tech', fa: 'فناوری', en: 'Tech', emoji: '💻' },
  { id: 'games', fa: 'بازی و ذهن', en: 'Games & mind', emoji: '🎮' },
] as const

type RoomId = (typeof WORLD_ROOMS)[number]['id']

function roomPrefix(room: string) {
  return `[[room:${room}]]`
}
function stripRoom(body: string): { room: RoomId; text: string } {
  const m = /^(?:\[\[room:([a-z_]+)\]\]\s*)/i.exec(body || '')
  if (m && WORLD_ROOMS.some((r) => r.id === m[1])) {
    return { room: m[1] as RoomId, text: body.slice(m[0].length) }
  }
  return { room: 'general', text: body || '' }
}


import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Globe2, Send, Pencil, Trash2, Check, X, Smile } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { MAX_BODY, MAX_PER_HOUR, MIN_INTERVAL_MS, sanitizeGlobalMessage } from '@/lib/chat-safety'
import { SITE_STICKERS, encodeSticker, parseSticker, isStickerMessage } from '@/lib/stickers'
import HumanState from '@/components/HumanState'
import { getSavedAvatar } from '@/lib/avatars'

type Msg = {
  id: string
  username: string
  body: string
  created_at: string
  user_id?: string | null
  avatar_url?: string | null
}

type PublicProfile = {
  id?: string
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
  level?: number | null
  xp?: number | null
  bio?: string | null
}

function fallbackAvatar(seed: string) {
  return `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed || 'user')}`
}

function avatarFor(m: Msg) {
  return m.avatar_url || fallbackAvatar(m.username || m.user_id || 'user')
}

function timeLabel(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function WorldChatPage() {
  const { dict, dir, locale } = useLocale()
  const [messages, setMessages] = useState<Msg[]>([])
  const [room, setRoom] = useState<RoomId>('general')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [stickerOpen, setStickerOpen] = useState(false)
  const [error, setError] = useState('')
  const [myId, setMyId] = useState<string | null>(null)
  const [myUsername, setMyUsername] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [profileOpen, setProfileOpen] = useState<PublicProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastSentRef = useRef(0)
  const myIdRef = useRef<string | null>(null)

  const loggedIn = Boolean(myId)

  /** session سریع — بدون انتظار طولانی */
  const refreshMe = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMyId(null)
      myIdRef.current = null
      setMyUsername('')
      return null as string | null
    }
    try {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      if (!user) {
        setMyId(null)
        myIdRef.current = null
        setMyUsername('')
        return null
      }
      setMyId(user.id)
      myIdRef.current = user.id
      let un = String(user.user_metadata?.username || '')
      // پروفایل را fire-and-forget نکن — سریع موازی
      supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: p }) => {
          if (p?.username) {
            setMyUsername(String(p.username))
          } else if (un) setMyUsername(un)
        })
      if (un) setMyUsername(un)
      return user.id
    } catch {
      return null
    }
  }, [])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }
    try {
      // ۱) API — بدون فیلتر بدون پاکسازی روزانه
      try {
        const apiRes = await fetch('/api/world', { cache: 'no-store' })
        if (apiRes.ok) {
          const data = await apiRes.json()
          if (Array.isArray(data.messages)) {
            setMessages(data.messages as Msg[])
            setError('')
            return
          }
        }
      } catch {
        /* fallback below */
      }

      // ۲) کلاینت — آخرین پیام‌ها (بدون حذف روزانه)
      const supabase = createClient()
      let res = await supabase
        .from('global_messages')
        .select('id, username, body, created_at, user_id, avatar_url')
        .order('created_at', { ascending: true })
        .limit(400)

      if (res.error) {
        res = (await supabase
          .from('global_messages')
          .select('id, username, body, created_at, user_id')
          .order('created_at', { ascending: true })
          .limit(400)) as any
      }
      if (res.error) throw new Error(res.error.message)
      setMessages((res.data as Msg[]) || [])
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'بارگذاری نشد')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await Promise.all([refreshMe(), load()])
    })()
    // هر ۵ دقیقه دوباره پاکسازی/بارگذاری (پیام‌های قدیمی‌تر از ۲۴س حذف شوند)
    const timer = window.setInterval(() => {
      if (alive) void load()
    }, 5 * 60 * 1000)

    let unsub: { unsubscribe: () => void } | null = null
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient()
        const { data } = supabase.auth.onAuthStateChange((_e, session) => {
          if (!alive) return
          if (session?.user) {
            setMyId(session.user.id)
            myIdRef.current = session.user.id
            const un = String(session.user.user_metadata?.username || '')
            if (un) setMyUsername(un)
          } else {
            setMyId(null)
            myIdRef.current = null
            setMyUsername('')
          }
        })
        unsub = data.subscription
      } catch {
        /* ignore */
      }
    }

    // رفرش ملایم‌تر
    const t = window.setInterval(() => void load(), 20000)
    return () => {
      window.clearInterval(timer)
      alive = false
      window.clearInterval(t)
      unsub?.unsubscribe()
    }
  }, [load, refreshMe])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const isMine = (m: Msg) => {
    const uid = myIdRef.current || myId
    if (uid && m.user_id && String(m.user_id) === String(uid)) return true
    if (myUsername && m.username && m.username.toLowerCase() === myUsername.toLowerCase()) return true
    return false
  }

  const send = async () => {
    setError('')
    if (!text.trim() || !isSupabaseConfigured()) return
    setSending(true)
    const optimisticText = text.trim()
    try {
      const supabase = createClient()
      let uid = myIdRef.current || myId
      if (!uid) uid = await refreshMe()
      if (!uid) {
        setError('برای ارسال وارد حساب شو.')
        return
      }

      const now = Date.now()
      if (now - lastSentRef.current < MIN_INTERVAL_MS) {
        setError('کمی صبر کن.')
        return
      }

      const safe = sanitizeGlobalMessage(optimisticText)
      if (!safe.ok) {
        setError(safe.error)
        return
      }
      const payloadBody = roomPrefix(room) + safe.text

      // optimistic
      const tempId = `temp-${now}`
      const uname = myUsername || 'me'
      const av = getSavedAvatar() || fallbackAvatar(uname)
      const optimistic: Msg = {
        id: tempId,
        username: uname,
        body: payloadBody,
        created_at: new Date().toISOString(),
        user_id: uid,
        avatar_url: av,
      }
      setMessages((m) => [...m, optimistic])
      setText('')
      lastSentRef.current = now

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', uid)
        .maybeSingle()

      const username = (profile?.username || profile?.display_name || uname || 'user').toString().slice(0, 24)
      setMyUsername(username)
      const avatar_url = getSavedAvatar() || profile?.avatar_url || av

      let row: Msg | null = null
      const ins1 = await supabase
        .from('global_messages')
        .insert({ user_id: uid, username, body: payloadBody, avatar_url })
        .select('id, username, body, created_at, user_id, avatar_url')
        .single()

      if (ins1.error) {
        const ins2 = await supabase
          .from('global_messages')
          .insert({ user_id: uid, username, body: payloadBody })
          .select('id, username, body, created_at, user_id')
          .single()
        if (ins2.error) {
          setMessages((m) => m.filter((x) => x.id !== tempId))
          setError(ins2.error.message)
          return
        }
        row = { ...(ins2.data as Msg), avatar_url, user_id: uid }
      } else {
        row = { ...(ins1.data as Msg), user_id: ins1.data?.user_id || uid }
      }

      setMessages((m) => m.map((x) => (x.id === tempId ? (row as Msg) : x)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطا')
    } finally {
      setSending(false)
    }
  }


  const sendSticker = async (id: string) => {
    setError('')
    setStickerOpen(false)
    if (!isSupabaseConfigured()) return
    setSending(true)
    try {
      const supabase = createClient()
      let uid = myIdRef.current || myId
      if (!uid) uid = await refreshMe()
      if (!uid) {
        setError('برای ارسال وارد حساب شو.')
        return
      }
      const now = Date.now()
      if (now - lastSentRef.current < MIN_INTERVAL_MS) {
        setError('کمی صبر کن.')
        return
      }
      const payload = encodeSticker(id)
      const safe = sanitizeGlobalMessage(payload)
      if (!safe.ok) {
        setError(safe.error)
        return
      }
      const payloadBody = roomPrefix(room) + safe.text
      const tempId = `tmp-${now}`
      const uname = myUsername || 'user'
      const av = getSavedAvatar() || fallbackAvatar(uname)
      const optimistic: Msg = {
        id: tempId,
        username: uname,
        body: payloadBody,
        created_at: new Date().toISOString(),
        user_id: uid,
        avatar_url: av,
      }
      setMessages((list) => [...list, optimistic])
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', uid)
        .maybeSingle()
      const username = (profile?.username || profile?.display_name || uname || 'user').toString().slice(0, 24)
      const avatar_url = getSavedAvatar() || profile?.avatar_url || av
      let { data, error } = await supabase
        .from('global_messages')
        .insert({ user_id: uid, username, body: payloadBody, avatar_url })
        .select('id, username, body, created_at, user_id, avatar_url')
        .single()
      if (error) {
        const ins2 = await supabase
          .from('global_messages')
          .insert({ user_id: uid, username, body: payloadBody })
          .select('id, username, body, created_at, user_id')
          .single()
        if (ins2.error) throw new Error(ins2.error.message)
        data = { ...(ins2.data as Msg), avatar_url, user_id: uid }
      }
      lastSentRef.current = Date.now()
      setMessages((list) => list.map((m) => (m.id === tempId ? (data as Msg) : m)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ارسال نشد')
      setMessages((list) => list.filter((m) => !String(m.id).startsWith('tmp-')))
    } finally {
      setSending(false)
    }
  }

  const saveEdit = async (id: string) => {
    const safe = sanitizeGlobalMessage(editText)
    if (!safe.ok) {
      setError(safe.error)
      return
    }
    const uid = myIdRef.current || myId || (await refreshMe())
    if (!uid) {
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
        setError(upErr.message)
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
    const uid = myIdRef.current || myId || (await refreshMe())
    if (!uid) {
      setError('وارد حساب شو.')
      return
    }
    if (!window.confirm('حذف شود؟')) return
    setBusyId(id)
    // optimistic
    const prev = messages
    setMessages((list) => list.filter((m) => m.id !== id))
    try {
      const supabase = createClient()
      const { error: delErr } = await supabase
        .from('global_messages')
        .delete()
        .eq('id', id)
        .eq('user_id', uid)
      if (delErr) {
        setMessages(prev)
        setError(delErr.message)
      }
      if (editingId === id) {
        setEditingId(null)
        setEditText('')
      }
    } catch (e: unknown) {
      setMessages(prev)
      setError(e instanceof Error ? e.message : 'حذف نشد')
    } finally {
      setBusyId(null)
    }
  }

  const openProfile = async (m: Msg) => {
    setProfileLoading(true)
    setProfileOpen({
      id: m.user_id || '',
      username: m.username,
      display_name: m.username,
      avatar_url: avatarFor(m),
      level: null,
      xp: null,
    })
    try {
      if (!isSupabaseConfigured() || !m.user_id) {
        setProfileLoading(false)
        return
      }
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, level, xp, bio')
        .eq('id', m.user_id)
        .maybeSingle()
      if (data) {
        setProfileOpen({
          id: data.id,
          username: data.username,
          display_name: data.display_name,
          avatar_url: data.avatar_url || avatarFor(m),
          bio: (data as any).bio || null,
          level: data.level,
          xp: data.xp,
        })
      }
    } catch {
      /* keep basic */
    } finally {
      setProfileLoading(false)
    }
  }

  return (
    <main dir={dir} className="min-h-screen flex flex-col" style={{ color: 'var(--text)' }}>
      <header className="border-b border-[var(--border)] sticky top-0 z-20 bg-[var(--bg0)]">
        <div className="max-w-2xl mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Globe2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">گفتگوی جهانی</h1>
              <p className="text-[10px] text-[var(--muted)] truncate">
                {loggedIn ? `وارد · @${myUsername || '…'}` : 'مهمان — برای ارسال وارد شو'}
              </p>
            </div>
          </div>
          <Link href="/" className="text-xs text-[var(--muted)] inline-flex items-center gap-1 shrink-0">
            <ArrowRight className={`w-3.5 h-3.5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            {dict.home}
          </Link>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="max-w-2xl mx-auto px-3 py-3 min-h-[45vh] flex flex-col gap-2">
          {loading && <p className="text-xs text-[var(--muted)] text-center py-6">…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-[var(--muted)] text-center py-10">هنوز پیامی نیست.</p>
          )}

          
        <div className="world-room-tabs flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-none" role="tablist">
          {WORLD_ROOMS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={room === r.id}
              onClick={() => setRoom(r.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border transition ${
                room === r.id
                  ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)] font-semibold'
                  : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/40'
              }`}
            >
              {r.emoji} {locale === 'en' ? r.en : r.fa}
            </button>
          ))}
        </div>

          {messages.filter((m) => stripRoom(String((m as any).body ?? (m as any).content ?? "")).room === room).map((m) => {
            const mine = isMine(m)
            const editing = editingId === m.id
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                  mine ? 'self-start' : 'self-end'
                }`}
                style={{
                  // در ستون flex: self-start = سمت شروع زبان (راست در فارسی، چپ در انگلیسی)
                  alignSelf: mine ? 'flex-start' : 'flex-end',
                }}
              >
                <div
                  className="rounded-2xl px-3 py-2 border space-y-1.5"
                  style={{
                    background: mine
                      ? 'color-mix(in srgb, var(--accent) 18%, var(--card-solid))'
                      : 'var(--card-solid)',
                    borderColor: mine ? 'color-mix(in srgb, var(--accent) 35%, var(--border))' : 'var(--border)',
                    color: 'var(--text)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void openProfile(m)}
                      className="flex items-center gap-2 min-w-0 text-start hover:opacity-90"
                      title="مشاهده پروفایل"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarFor(m)}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover border border-[var(--border)] shrink-0"
                      />
                      <span className="text-[11px] font-mono text-[var(--accent)] truncate">{m.username}</span>
                    </button>
                    <span className="text-[9px] text-[var(--muted)] ms-auto shrink-0">{timeLabel(m.created_at)}</span>
                  </div>

                  {editing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value.slice(0, MAX_BODY))}
                        rows={2}
                        className="w-full rounded-xl px-2 py-1.5 border border-[var(--border)] bg-[var(--card)] text-sm resize-none"
                        style={{ color: 'var(--text)' }}
                        autoFocus
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === m.id}
                          onClick={() => void saveEdit(m.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium border inline-flex items-center gap-1"
                          style={{ color: 'var(--text)', background: 'var(--accent-dim)', borderColor: 'var(--border)' }}
                        >
                          <Check className="w-3 h-3" />
                          ذخیره
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null)
                            setEditText('')
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] border inline-flex items-center gap-1"
                          style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
                        >
                          <X className="w-3 h-3" />
                          انصراف
                        </button>
                      </div>
                    </div>
                  ) : (
                    (() => {
                      const st = parseSticker(m.body)
                      if (st) {
                        return (
                          <div className="flex flex-col items-start gap-0.5 py-1">
                            <span className="text-5xl leading-none select-none" title={st.label}>{st.emoji}</span>
                            <span className="text-[10px] text-[var(--muted)]">{st.label}</span>
                          </div>
                        )
                      }
                      return (
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{stripRoom(String(m.body || "")).text}</p>
                      )
                    })()
                  )}

                  {/* همیشه برای پیام خودت — متن واضح */}
                  {mine && !editing && (
                    <div className="flex gap-2 pt-0.5 border-t border-[var(--border)]/60">
                      {!isStickerMessage(m.body) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(m.id)
                          setEditText(m.body)
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold py-1"
                        style={{ color: 'var(--text)' }}
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                        ویرایش
                      </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void removeMsg(m.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold py-1"
                        style={{ color: 'var(--text)' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        حذف
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="world-composer border-t border-[var(--border)] sticky bottom-0 z-30 bg-[var(--bg0)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto px-3 py-2.5 space-y-1.5">
          {!loggedIn && (
            <p className="text-[11px] text-amber-200/90">
              <Link href="/auth" className="underline text-[var(--accent)]">
                وارد شو
              </Link>{' '}
              تا پیام بفرستی و ویرایش/حذف داشته باشی.
            </p>
          )}
          {error && <p className="text-[11px] text-rose-300 whitespace-pre-wrap">{error}</p>}
          {stickerOpen && (
            <div
              className="rounded-2xl border p-2 grid grid-cols-4 gap-2"
              style={{ background: 'var(--card-solid)', borderColor: 'var(--border)' }}
            >
              {SITE_STICKERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={sending || !loggedIn}
                  onClick={() => void sendSticker(s.id)}
                  className="flex flex-col items-center gap-0.5 rounded-xl py-2 hover:bg-[var(--accent-dim)] transition disabled:opacity-40"
                  title={s.label}
                >
                  <span className="text-2xl leading-none">{s.emoji}</span>
                  <span className="text-[10px] text-[var(--muted)]">{s.label}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_BODY))}
              rows={2}
              maxLength={MAX_BODY}
              placeholder="پیام…"
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
              disabled={sending || !loggedIn}
              onClick={() => setStickerOpen((v) => !v)}
              className="btn-secondary px-3 py-2.5 shrink-0"
              title="استیکر"
              aria-label="استیکر"
            >
              <Smile className="w-4 h-4" />
            </button>
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

      {/* پروفایل عمومی */}
      {profileOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="بستن"
            onClick={() => setProfileOpen(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl border p-4 space-y-3 shadow-2xl"
            style={{ background: 'var(--card-solid)', borderColor: 'var(--border)', color: 'var(--text)' }}
            dir={dir}
          >
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profileOpen.avatar_url || fallbackAvatar(profileOpen.username || 'u')}
                alt=""
                className="w-14 h-14 rounded-full object-cover border-2 border-[var(--accent)]"
              />
              <div className="min-w-0">
                <p className="font-bold truncate">{profileOpen.display_name || profileOpen.username || 'کاربر'}</p>
                <p className="text-xs font-mono text-[var(--accent)]" dir="ltr">
                  @{profileOpen.username || '—'}
                </p>
              </div>
            </div>
            {profileLoading ? (
              <p className="text-xs text-[var(--muted)]">…</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="rounded-xl border border-[var(--border)] py-2">
                    <p className="text-[10px] text-[var(--muted)]">سطح</p>
                    <p className="font-semibold">{profileOpen.level ?? '—'}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] py-2">
                    <p className="text-[10px] text-[var(--muted)]">XP</p>
                    <p className="font-semibold">{profileOpen.xp ?? '—'}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--border)] p-3 text-start">
                  <p className="text-[10px] text-[var(--muted)] mb-1">بیوگرافی</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {profileOpen.bio && String(profileOpen.bio).trim()
                      ? String(profileOpen.bio).trim()
                      : 'بیوگرافی ثبت نشده.'}
                  </p>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen(null)}
              className="w-full btn-secondary py-2 text-sm"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
