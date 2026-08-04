'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { migrateLocalToServerIfNeeded, loadMindMapFromServer, upsertProfilePatch } from '@/lib/sync'

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [mapSummary, setMapSummary] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      try {
        if (!isSupabaseConfigured()) {
          setError('Supabase تنظیم نشده است.')
          return
        }

        const supabase = createClient()
        const { data: authData, error: authErr } = await supabase.auth.getUser()
        if (authErr) throw authErr
        if (!authData.user) {
          window.location.href = '/auth'
          return
        }

        const user = authData.user
        setEmail(user.email ?? null)

        // اگر پروفایل نبود بساز
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('display_name, xp, level, locale, theme')
          .eq('id', user.id)
          .maybeSingle()

        if (profileErr) {
          console.warn('profile select', profileErr.message)
        }

        if (!profile) {
          const display =
            (user.user_metadata?.display_name as string) ||
            user.email?.split('@')[0] ||
            'کاربر'
          const { error: insErr } = await supabase.from('profiles').upsert({
            id: user.id,
            display_name: display,
            updated_at: new Date().toISOString(),
          })
          if (insErr) {
            console.warn('profile upsert', insErr.message)
            setError(
              'پروفایل ساخته نشد. در SQL این را Run کن: policy درج profiles. جزئیات: ' +
                insErr.message
            )
          }
          setName(display)
          setStatus('پروفایل جدید ساخته شد')
        } else {
          if (profile.display_name) setName(profile.display_name)
          setStatus(`سطح ${profile.level ?? 1} · XP ${profile.xp ?? 0}`)
        }

        // همگام‌سازی را خطا ندهد صفحه را
        try {
          await migrateLocalToServerIfNeeded()
        } catch (e) {
          console.warn('migrate', e)
        }

        try {
          const map = await loadMindMapFromServer()
          if (map?.summary) setMapSummary(String(map.summary))
        } catch (e) {
          console.warn('map', e)
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'خطا در بارگذاری حساب')
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [])

  const saveName = async () => {
    setError('')
    const res = await upsertProfilePatch({ display_name: name.trim() })
    if (res.ok) setStatus('نام ذخیره شد.')
    else setError(res.reason || 'خطا در ذخیره')
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ color: 'var(--text)' }}>
        در حال بارگذاری حساب...
      </main>
    )
  }

  return (
    <main className="min-h-screen rtl px-4 py-10" style={{ color: 'var(--text)' }}>
      <div className="max-w-lg mx-auto card space-y-5">
        <div>
          <h1 className="text-xl font-bold">حساب من · WAIMA</h1>
          <p className="text-sm text-[var(--muted)]">من کیستم؟ · ترسیم‌گر ذهنی</p>
        </div>

        <div className="text-sm space-y-1">
          <p>
            ایمیل: <span className="text-[var(--accent)]">{email}</span>
          </p>
          <p className="text-[var(--muted)]">{status}</p>
          {mapSummary && <p className="text-[var(--muted)]">آخرین نقشه: {mapSummary}</p>}
          {error && <p className="text-rose-400 text-sm leading-relaxed">{error}</p>}
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[var(--muted)]">نام نمایشی</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
            style={{ color: 'var(--text)' }}
          />
          <button onClick={saveName} className="btn-primary px-4 py-2 text-sm">
            ذخیره نام
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/start" className="btn-primary px-4 py-2">
            گفتگو
          </Link>
          <Link href="/map" className="btn-secondary px-4 py-2">
            نقشه ذهن
          </Link>
          <Link href="/play" className="btn-secondary px-4 py-2">
            بازی‌ها
          </Link>
          <button onClick={logout} className="btn-secondary px-4 py-2">
            خروج
          </button>
        </div>

        <Link href="/" className="block text-center text-sm text-[var(--muted)]">
          خانه
        </Link>
      </div>
    </main>
  )
}
