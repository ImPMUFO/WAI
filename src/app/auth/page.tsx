'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { migrateLocalToServerIfNeeded } from '@/lib/sync'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  const submit = async () => {
    setMsg('')
    if (!isSupabaseConfigured()) {
      setMsg('Supabase هنوز تنظیم نشده است.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()

      if (mode === 'forgot') {
        if (!email.trim()) {
          setMsg('ایمیل را وارد کن.')
          return
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined,
        })
        if (error) throw error
        setMsg('اگر ایمیل درست باشد، لینک بازیابی ارسال شد.')
        return
      }

      if (!email.trim() || password.length < 6) {
        setMsg('ایمیل و رمز (حداقل ۶ کاراکتر) لازم است.')
        return
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() || undefined } },
        })
        if (error) throw error
        setMsg('ثبت‌نام انجام شد. حالا می‌توانی وارد شوی.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        await migrateLocalToServerIfNeeded()
        setMsg('ورود موفق بود. داده‌های محلی به حساب منتقل می‌شوند...')
        window.location.href = '/account'
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'خطا در احراز هویت')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserEmail(null)
    setMsg('خارج شدی.')
  }

  return (
    <main className="min-h-screen rtl flex items-center justify-center px-4" style={{ color: 'var(--text)' }}>
      <div className="w-full max-w-md card space-y-4">
        <div>
          <h1 className="text-xl font-bold">WAIMA</h1>
          <p className="text-sm text-[var(--muted)]">من کیستم؟ · ترسیم‌گر ذهنی</p>
        </div>

        {userEmail && (
          <div className="rounded-xl border border-[var(--border)] p-3 text-sm space-y-2">
            <p>
              وارد شده‌ای: <span className="text-[var(--accent)]">{userEmail}</span>
            </p>
            <div className="flex gap-2">
              <Link href="/account" className="btn-primary px-3 py-2 text-xs">
                حساب من
              </Link>
              <button onClick={logout} className="btn-secondary px-3 py-2 text-xs">
                خروج
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 text-sm">
          {(
            [
              ['login', 'ورود'],
              ['signup', 'ثبت‌نام'],
              ['forgot', 'فراموشی رمز'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className={`flex-1 py-2 rounded-lg border text-xs sm:text-sm ${
                mode === id ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'signup' && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام نمایشی"
            className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
            style={{ color: 'var(--text)' }}
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ایمیل"
          className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
          style={{ color: 'var(--text)' }}
        />
        {mode !== 'forgot' && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="رمز عبور"
            className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
            style={{ color: 'var(--text)' }}
          />
        )}

        <button onClick={submit} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading
            ? '...'
            : mode === 'login'
              ? 'ورود'
              : mode === 'signup'
                ? 'ثبت‌نام'
                : 'ارسال لینک بازیابی'}
        </button>

        {msg && <p className="text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap">{msg}</p>}

        <Link href="/" className="block text-center text-sm text-[var(--muted)]">
          بازگشت
        </Link>
      </div>
    </main>
  )
}
