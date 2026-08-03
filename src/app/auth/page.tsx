'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setMsg('')
    if (!isSupabaseConfigured()) {
      setMsg('Supabase هنوز در Vercel تنظیم نشده است.')
      return
    }
    if (!email.trim() || password.length < 6) {
      setMsg('ایمیل و رمز (حداقل ۶ کاراکتر) لازم است.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() || undefined } },
        })
        if (error) throw error
        setMsg('ثبت‌نام انجام شد. اگر تأیید ایمیل روشن است، صندوق ورودی را چک کن.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        setMsg('ورود موفق بود.')
        window.location.href = '/start'
      }
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'خطا در احراز هویت')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen rtl flex items-center justify-center px-4" style={{ color: 'var(--text)' }}>
      <div className="w-full max-w-md card space-y-4">
        <div>
          <h1 className="text-xl font-bold">WAIMA</h1>
          <p className="text-sm text-[var(--muted)]">من کیستم؟ · ترسیم‌گر ذهنی</p>
        </div>

        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg border ${mode === 'login' ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'}`}
          >
            ورود
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg border ${mode === 'signup' ? 'border-[var(--accent)] bg-[var(--accent)]/15' : 'border-[var(--border)]'}`}
          >
            ثبت‌نام
          </button>
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
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="رمز عبور"
          className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
          style={{ color: 'var(--text)' }}
        />

        <button onClick={submit} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? '...' : mode === 'login' ? 'ورود' : 'ثبت‌نام'}
        </button>

        {msg && <p className="text-sm text-[var(--muted)] leading-relaxed">{msg}</p>}

        <Link href="/" className="block text-center text-sm text-[var(--muted)]">
          بازگشت
        </Link>
      </div>
    </main>
  )
}
