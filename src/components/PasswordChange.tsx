'use client'

import { useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * تغییر رمز با تأیید رمز فعلی — بدون سقف روزانه
 */
export default function PasswordChange() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const submit = async () => {
    setMsg('')
    setErr('')
    if (!isSupabaseConfigured()) {
      setErr('Supabase تنظیم نشده.')
      return
    }
    if (current.length < 6) {
      setErr('رمز فعلی را وارد کن (حداقل ۶ کاراکتر).')
      return
    }
    if (next.length < 6) {
      setErr('رمز جدید حداقل ۶ کاراکتر باشد.')
      return
    }
    if (next !== confirm) {
      setErr('رمز جدید و تکرارش یکی نیست.')
      return
    }
    if (next === current) {
      setErr('رمز جدید همان رمز فعلی است.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: u } = await supabase.auth.getUser()
      if (!u.user?.email) {
        setErr('وارد حساب نیستی.')
        return
      }

      // تأیید رمز فعلی با ورود مجدد
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: u.user.email,
        password: current,
      })
      if (signErr) {
        setErr('رمز فعلی اشتباه است.')
        return
      }

      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) throw error

      setCurrent('')
      setNext('')
      setConfirm('')
      setMsg('رمز با موفقیت عوض شد. یادداشتش کن.')
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'خطا در تغییر رمز')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card space-y-3">
      <p className="text-sm font-medium">تغییر رمز عبور</p>
      <p className="text-[11px] text-[var(--muted)] leading-relaxed">
        با وارد کردن رمز فعلی می‌توانی هر چند بار که بخواهی رمز را عوض کنی. محدودیتی مثل تغییر آیدی ندارد.
      </p>

      <div className="space-y-1">
        <label className="text-xs text-[var(--muted)]">رمز فعلی</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
          style={{ color: 'var(--text)' }}
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-[var(--muted)]">رمز جدید</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
          style={{ color: 'var(--text)' }}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-[var(--muted)]">تکرار رمز جدید</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
          style={{ color: 'var(--text)' }}
          autoComplete="new-password"
        />
      </div>

      {err && <p className="text-xs text-rose-300">{err}</p>}
      {msg && <p className="text-xs text-emerald-300">{msg}</p>}

      <button type="button" disabled={loading} onClick={() => void submit()} className="btn-primary px-4 py-2 text-sm">
        {loading ? '…' : 'ذخیره رمز جدید'}
      </button>
    </div>
  )
}
