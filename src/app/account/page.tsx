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
  const [mapSummary, setMapSummary] = useState<string>('')

  useEffect(() => {
    const run = async () => {
      if (!isSupabaseConfigured()) {
        setStatus('Supabase تنظیم نشده.')
        setLoading(false)
        return
      }
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        window.location.href = '/auth'
        return
      }
      setEmail(data.user.email ?? null)

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, xp, level, locale, theme')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.display_name) setName(profile.display_name)

      await migrateLocalToServerIfNeeded()
      const map = await loadMindMapFromServer()
      if (map?.summary) setMapSummary(String(map.summary))

      setStatus(
        profile
          ? `سطح ${profile.level ?? 1} · XP ${profile.xp ?? 0}`
          : 'پروفایل آماده است'
      )
      setLoading(false)
    }
    void run()
  }, [])

  const saveName = async () => {
    const res = await upsertProfilePatch({ display_name: name.trim() })
    setStatus(res.ok ? 'نام ذخیره شد.' : res.reason)
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
