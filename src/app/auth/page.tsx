'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { recoverEverything, migrateLocalToServerIfNeeded } from '@/lib/sync'
import {
  PASSWORD_WARN,
  USERNAME_HELP,
  usernameToEmail,
  validateUsername,
} from '@/lib/username'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const { dict, dir } = useLocale()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'info' | 'ok' | 'err'>('info')

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = '/account'
    })
  }, [])

  const setMessage = (text: string, type: 'info' | 'ok' | 'err' = 'info') => {
    setMsg(text)
    setMsgType(type)
  }

  const submit = async () => {
    setMsg('')
    if (!isSupabaseConfigured()) {
      setMessage('Supabase هنوز تنظیم نشده است.', 'err')
      return
    }
    const v = validateUsername(username)
    if (!v.ok) {
      setMessage(v.error, 'err')
      return
    }
    if (password.length < 6) {
      setMessage('رمز حداقل ۶ کاراکتر باشد.', 'err')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const email = usernameToEmail(v.value)

      if (mode === 'signup') {
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', v.value)
          .maybeSingle()
        if (taken?.id) {
          setMessage('این آیدی قبلاً گرفته شده. یکی دیگر انتخاب کن.', 'err')
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: v.value,
              display_name: displayName.trim() || v.value,
            },
          },
        })
        if (error) throw error

        const uid = data.user?.id
        if (uid) {
          await supabase.from('profiles').upsert({
            id: uid,
            username: v.value,
            display_name: displayName.trim() || v.value,
            updated_at: new Date().toISOString(),
          })
        }

        if (data.session) {
          void recoverEverything()
          void migrateLocalToServerIfNeeded()
          setMessage('ثبت‌نام موفق بود.', 'ok')
          window.location.href = '/account'
          return
        }

        setMessage(
          'ثبت‌نام انجام شد. اگر ورود خودکار نشد، با همان آیدی و رمز وارد شو.\nدر Supabase گزینه Confirm email را خاموش کن.',
          'ok'
        )
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const m = (error.message || '').toLowerCase()
          if (m.includes('not confirmed')) {
            setMessage(
              'Confirm email هنوز روشن است. در Supabase: Authentication → Providers → Email → Confirm email را خاموش کن.',
              'err'
            )
            return
          }
          if (m.includes('invalid')) {
            setMessage('آیدی یا رمز اشتباه است.', 'err')
            return
          }
          throw error
        }
        void recoverEverything()
        void migrateLocalToServerIfNeeded()
        setMessage('ورود موفق.', 'ok')
        window.location.href = '/account'
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'خطا در احراز هویت'
      setMessage(message, 'err')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main dir={dir} className="min-h-screen px-4 py-10" style={{ color: 'var(--text)' }}>
      <div className="max-w-md mx-auto space-y-5">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">{mode === 'login' ? dict.login : dict.signup}</h1>
          <p className="text-sm text-[var(--muted)]">{dict.brandName}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={`flex-1 py-2 rounded-xl border ${mode === 'login' ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'}`}
            onClick={() => setMode('login')}
          >
            {dict.login}
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-xl border ${mode === 'signup' ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'}`}
            onClick={() => setMode('signup')}
          >
            {dict.signup}
          </button>
        </div>

        <div className="card space-y-3">
          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--muted)]">نام نمایشی (اختیاری)</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
                style={{ color: 'var(--text)' }}
                placeholder="مثلاً علی"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-[var(--muted)]">آیدی (Username)</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)] font-mono"
              style={{ color: 'var(--text)' }}
              placeholder="ali_reza2"
              maxLength={20}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <p className="text-[11px] text-[var(--muted)] leading-relaxed">{USERNAME_HELP}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[var(--muted)]">رمز عبور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
              style={{ color: 'var(--text)' }}
              placeholder="حداقل ۶ کاراکتر"
            />
          </div>

          <p className="text-[11px] text-amber-200/90 leading-relaxed border border-amber-500/30 rounded-xl p-3">
            {PASSWORD_WARN}
          </p>

          {msg && (
            <p
              className={`text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-3 border ${
                msgType === 'err'
                  ? 'border-rose-500/40 text-rose-300'
                  : msgType === 'ok'
                    ? 'border-emerald-500/40 text-emerald-300'
                    : 'border-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {msg}
            </p>
          )}

          <button type="button" disabled={loading} onClick={() => void submit()} className="btn-primary w-full py-3">
            {loading ? '…' : mode === 'login' ? dict.login : dict.signup}
          </button>
        </div>

        <Link href="/" className="block text-center text-sm text-[var(--muted)]">
          {dict.home}
        </Link>
      </div>
    </main>
  )
}
