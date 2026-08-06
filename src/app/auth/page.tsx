'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { recoverAllLocalDataToServer, migrateLocalToServerIfNeeded } from '@/lib/sync'
import { migrateLocalToServerIfNeeded } from '@/lib/sync'

type Mode = 'login' | 'signup' | 'forgot'

export default function AuthPage() {
  const { dict, dir } = useLocale()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'info' | 'ok' | 'err'>('info')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
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
    setLoading(true)
    try {
      const supabase = createClient()

      if (mode === 'forgot') {
        if (!email.trim()) {
          setMessage('ایمیل را وارد کن.', 'err')
          return
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined,
        })
        if (error) throw error
        setMessage(
          'اگر این ایمیل ثبت شده باشد، لینک بازیابی رمز برایت ارسال شد. صندوق ورودی و پوشه Spam را چک کن.',
          'ok'
        )
        return
      }

      if (!email.trim() || password.length < 6) {
        setMessage('ایمیل و رمز (حداقل ۶ کاراکتر) لازم است.', 'err')
        return
      }

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: name.trim() || undefined } },
        })
        if (error) throw error

        // اگر سشن بلافاصله آمد یعنی Confirm email خاموش است
        if (data.session) {
          await migrateLocalToServerIfNeeded()
          setMessage('ثبت‌نام و ورود انجام شد.', 'ok')
          window.location.href = '/account'
          return
        }

        setMessage(
          'ثبت‌نام اولیه انجام شد.\n\n' +
            '۱) به صندوق ایمیل خودت برو (گاهی در Spam است).\n' +
            '۲) ایمیل تأیید WAIMA / Supabase را باز کن.\n' +
            '۳) روی لینک تأیید کلیک کن تا ایمیلت تأیید شود.\n' +
            '۴) بعد به همین صفحه برگرد و از بخش «ورود» وارد حساب شو.\n\n' +
            'تا وقتی روی لینک نزنید، ورود کامل نمی‌شود و حساب فعال نمی‌گردد.',
          'ok'
        )
        setMode('login')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) {
          const m = (error.message || '').toLowerCase()
          if (m.includes('email not confirmed') || m.includes('not confirmed')) {
            setMessage(
              'ایمیلت هنوز تأیید نشده است.\n\n' +
                'لطفاً صندوق ورودی (و Spam) را باز کن، روی لینک تأیید داخل ایمیل بزن، ' +
                'بعد دوباره از اینجا وارد شو.\n\n' +
                'تا قبل از تأیید لینک، حسابت کامل فعال نمی‌شود.',
              'err'
            )
            return
          }
          if (m.includes('invalid login') || m.includes('invalid credentials')) {
            setMessage('ایمیل یا رمز اشتباه است. اگر تازه ثبت‌نام کردی، اول ایمیلت را از طریق لینک تأیید کن.', 'err')
            return
          }
          throw error
        }
        if (!data.session) {
          setMessage('ورود کامل نشد. اگر ایمیلت را تأیید کرده‌ای، دوباره تلاش کن.', 'err')
          return
        }
        await migrateLocalToServerIfNeeded()
        setMessage('ورود موفق بود. در حال رفتن به حساب...', 'ok')
        void recoverAllLocalDataToServer()
        void migrateLocalToServerIfNeeded()
        window.location.href = '/account'
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'خطا در احراز هویت', 'err')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserEmail(null)
    setMessage('خارج شدی.', 'info')
  }

  const msgClass =
    msgType === 'ok'
      ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
      : msgType === 'err'
        ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
        : 'text-[var(--muted)] border-[var(--border)] bg-[var(--card)]'

  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center px-4" style={{ color: 'var(--text)' }}>
      <div className="w-full max-w-md card space-y-4">
        <div>
          <h1 className="text-xl font-bold">WAIMA</h1>
          <p className="text-sm text-[var(--muted)]">من کیستم؟ · ترسیم‌گر ذهنی</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
          {dict.authHint}
        </div>

        {userEmail && (
          <div className="rounded-xl border border-[var(--border)] p-3 text-sm space-y-2">
            <p>
              {dict.loggedInAs}: <span className="text-[var(--accent)]">{userEmail}</span>
            </p>
            <div className="flex gap-2">
              <Link href="/account" className="btn-primary px-3 py-2 text-xs">
                {dict.account}
              </Link>
              <button onClick={logout} className="btn-secondary px-3 py-2 text-xs">
                {dict.logout}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2 text-sm">
          {(
            [
              ['login', dict.login],
              ['signup', dict.signup],
              ['forgot', dict.forgotPassword],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setMode(id)
                setMsg('')
              }}
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
            placeholder={dict.displayName}
            className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
            style={{ color: 'var(--text)' }}
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={dict.email}
          className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
          style={{ color: 'var(--text)' }}
        />
        {mode !== 'forgot' && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={dict.password}
            className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
            style={{ color: 'var(--text)' }}
          />
        )}

        <button onClick={submit} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading
            ? '...'
            : mode === 'login'
              ? dict.login
              : mode === 'signup'
                ? dict.signup
                : dict.sendResetLink}
        </button>

        {msg && (
          <div className={`rounded-xl border p-3 text-sm leading-relaxed whitespace-pre-wrap ${msgClass}`}>
            {msg}
          </div>
        )}

        <Link href="/" className="block text-center text-sm text-[var(--muted)]">
          {dict.back}
        </Link>
      </div>
    </main>
  )
}
