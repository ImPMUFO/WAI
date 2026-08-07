'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Globe2, Send } from 'lucide-react'
import { useLocale } from '@/lib/i18n/LocaleProvider'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { MAX_BODY } from '@/lib/chat-safety'

type Msg = {
  id: string
  username: string
  body: string
  created_at: string
  user_id?: string
}

function timeLabel(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
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
  const listRef = useRef<HTMLDivElement>(null)

  const authHeader = useCallback(async () => {
    if (!isSupabaseConfigured()) return {}
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/world', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) setMessages(data.messages || [])
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const t = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(Boolean(data.session))
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    setError('')
    if (!loggedIn) {
      setError('برای ارسال پیام وارد حساب شو.')
      return
    }
    if (!text.trim()) return
    setSending(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(await authHeader()),
      }
      const res = await fetch('/api/world', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'ارسال نشد')
        return
      }
      setText('')
      if (data.message) {
        setMessages((m) => [...m, data.message])
      } else {
        await load()
      }
    } catch {
      setError('خطای شبکه')
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

      <div ref={listRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3 min-h-[50vh]">
          {loading && <p className="text-sm text-[var(--muted)] text-center">…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-[var(--muted)] text-center py-10">هنوز پیامی نیست. اولین نفر باش.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className="card !py-2.5 !px-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-[var(--accent)]">{m.username}</span>
                <span className="text-[10px] text-[var(--muted)]">{timeLabel(m.created_at)}</span>
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
              . همه می‌توانند پیام‌ها را بخوانند.
            </p>
          )}
          {error && <p className="text-xs text-rose-300">{error}</p>}
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
              title="ارسال"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-[var(--muted)]">
            {text.length}/{MAX_BODY} · بدون لینک · بدون کد · حداقل فاصله بین پیام‌ها
          </p>
        </div>
      </div>
    </main>
  )
}
