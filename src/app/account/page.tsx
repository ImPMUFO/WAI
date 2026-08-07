'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured, waitForSession } from '@/lib/supabase/client'
import {
  recoverEverything,
  migrateLocalToServerIfNeeded,
  loadMindMapFromServer,
  upsertProfilePatch,
} from '@/lib/sync'
import UsernameEditor from '@/components/UsernameEditor'
import AvatarPicker from '@/components/AvatarPicker'
import PasswordChange from '@/components/PasswordChange'

export default function AccountPage() {
  const { dict, dir } = useLocale()

  const [username, setUsername] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState('—')
  const [loading, setLoading] = useState(true)
  const [mapSummary, setMapSummary] = useState('')
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        if (!isSupabaseConfigured()) {
          setError('Supabase تنظیم نشده.')
          setLoading(false)
          return
        }

        // منتظر خواندن session از localStorage
        const session = await waitForSession(2000)
        if (cancelled) return

        if (!session?.user) {
          setLoading(false)
          window.location.replace('/auth')
          return
        }

        const user = session.user
        setUserId(user.id)
        const metaUser = String(user.user_metadata?.username || '')
        const metaName = String(
          user.user_metadata?.display_name || user.user_metadata?.username || 'کاربر'
        )
        setUsername(metaUser)
        setName(metaName)
        setStatus('وارد شده‌ای')
        setLoading(false)

        // پس‌زمینه — UI را نگه ندار
        void (async () => {
          try {
            const supabase = createClient()
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', user.id)
              .maybeSingle()

            if (cancelled) return
            if (profile?.username) setUsername(String(profile.username))
            if (profile?.display_name) setName(String(profile.display_name))

            if (!profile) {
              await supabase.from('profiles').upsert({
                id: user.id,
                display_name: metaName,
                username: metaUser || null,
                updated_at: new Date().toISOString(),
              })
            }

            void recoverEverything()
            void migrateLocalToServerIfNeeded()
            try {
              const map = await loadMindMapFromServer()
              if (map?.summary && !cancelled) setMapSummary(String(map.summary).slice(0, 120))
            } catch {
              /* ignore */
            }
          } catch {
            /* ignore background */
          }
        })()
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'خطا')
          setLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  const saveName = async () => {
    await upsertProfilePatch({ display_name: name.trim() || 'کاربر' })
    setStatus('ذخیره شد')
  }

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <main dir={dir} className="min-h-screen flex items-center justify-center px-4" style={{ color: 'var(--text)' }}>
        <p className="text-sm text-[var(--muted)]">در حال بارگذاری حساب…</p>
      </main>
    )
  }

  if (!userId) {
    return (
      <main dir={dir} className="min-h-screen flex items-center justify-center px-4" style={{ color: 'var(--text)' }}>
        <div className="text-center space-y-3">
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <Link href="/auth" className="btn-primary inline-block px-4 py-2 text-sm">
            {dict.login}
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main dir={dir} className="min-h-screen px-4 py-10" style={{ color: 'var(--text)' }}>
      <div className="max-w-lg mx-auto card space-y-5">
        <div>
          <h1 className="text-xl font-bold">{dict.accountTitle} · WAIMA</h1>
          <p className="text-sm text-[var(--muted)]">
            {dict.brandTag} · {dict.brandSub}
          </p>
        </div>

        <div className="text-sm space-y-1">
          <p>
            آیدی:{' '}
            <span className="text-[var(--accent)] font-mono" dir="ltr">
              {username ? `@${username}` : '—'}
            </span>
          </p>
          <p className="text-[var(--muted)]">{status}</p>
          {mapSummary && (
            <p className="text-[var(--muted)]">
              {dict.lastMap}: {mapSummary}
            </p>
          )}
          {error && <p className="text-rose-300 text-sm">{error}</p>}
        </div>

        <div className="card space-y-2">
          <AvatarPicker />
        </div>

        <UsernameEditor />
        <PasswordChange />

        <div className="space-y-2">
          <label className="text-xs text-[var(--muted)]">{dict.displayName}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
            style={{ color: 'var(--text)' }}
          />
          <button type="button" onClick={() => void saveName()} className="btn-primary px-4 py-2 text-sm">
            {dict.saveName}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/start" className="btn-primary px-4 py-2">
            {dict.chat}
          </Link>
          <Link href="/map" className="btn-secondary px-4 py-2">
            {dict.mindMap}
          </Link>
          <Link href="/play" className="btn-secondary px-4 py-2">
            {dict.games}
          </Link>
          <Link href="/world" className="btn-secondary px-4 py-2">
            گفتگوی جهانی
          </Link>
          <button type="button" onClick={() => void logout()} className="btn-secondary px-4 py-2">
            {dict.logout}
          </button>
        </div>

        <Link href="/" className="block text-center text-sm text-[var(--muted)]">
          {dict.home}
        </Link>
      </div>
    </main>
  )
}
