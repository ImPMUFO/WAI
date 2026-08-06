'use client'

import { useLocale } from '@/lib/i18n/LocaleProvider'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { migrateLocalToServerIfNeeded, loadMindMapFromServer, upsertProfilePatch } from '@/lib/sync'

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`زمان‌تمام: ${label}`)), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

export default function AccountPage() {
  const { dict, dir } = useLocale()

  const [email, setEmail] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('—')
  const [loading, setLoading] = useState(true)
  const [mapSummary, setMapSummary] = useState('')
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (!cancelled) {
            setError('کلیدهای Supabase روی Vercel تنظیم نشده یا بعد از تنظیم Redeploy نشده.')
            setLoading(false)
          }
          return
        }

        const supabase = createClient()

        // سریع‌تر از getUser: اول سشن محلی
        const sessionRes = await withTimeout(supabase.auth.getSession(), 6000, 'getSession')
        const sessionUser = sessionRes.data.session?.user

        if (!sessionUser) {
          // یک‌بار هم با getUser امتحان کن
          try {
            const userRes = await withTimeout(supabase.auth.getUser(), 6000, 'getUser')
            if (!userRes.data.user) {
              window.location.href = '/auth'
              return
            }
          } catch {
            window.location.href = '/auth'
            return
          }
        }

        const user = sessionUser || (await supabase.auth.getUser()).data.user
        if (!user) {
          window.location.href = '/auth'
          return
        }

        if (cancelled) return

        // همین‌جا UI را باز کن — دیگر منتظر sync نباش
        setEmail(user.email ?? null)
        setName(
          (user.user_metadata?.display_name as string) ||
            user.email?.split('@')[0] ||
            'کاربر'
        )
        setStatus('وارد شده‌ای')
        setLoading(false)

        // بقیه در پس‌زمینه
        void (async () => {
          try {
            const profileRes = await withTimeout(
              Promise.resolve(
                supabase
                  .from('profiles')
                  .select('display_name, xp, level, locale, theme')
                  .eq('id', user.id)
                  .maybeSingle()
              ),
              8000,
              'profile'
            )
            const profile = (profileRes as any)?.data
            const profileErr = (profileRes as any)?.error

            if (profileErr) {
              setHint('خواندن پروفایل: ' + profileErr.message)
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
                setHint(
                  'ساخت پروفایل ممکن نشد. در Supabase این SQL را Run کن:\n' +
                    'create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);\n' +
                    'جزئیات: ' +
                    insErr.message
                )
              } else {
                setStatus('پروفایل ساخته شد')
              }
              setName(display)
            } else {
              if (profile.display_name) setName(profile.display_name)
              setStatus(`${dict.levelWord} ${profile.level ?? 1} · XP ${profile.xp ?? 0}`)
            }
          } catch (e: unknown) {
            setHint(e instanceof Error ? e.message : 'خطا در پروفایل')
          }

          try {
            await withTimeout(migrateLocalToServerIfNeeded(), 10000, 'migrate')
          } catch {
            /* نادیده */
          }

          try {
            const map = await withTimeout(loadMindMapFromServer(), 8000, 'map')
            if (map?.summary) setMapSummary(String(map.summary))
          } catch {
            /* نادیده */
          }
        })()
      } catch (e: unknown) {
        if (!cancelled) {
          setError(
            (e instanceof Error ? e.message : 'خطا در بارگذاری حساب') +
              '\nاگر تازه لاگین کردی یک‌بار از /auth دوباره وارد شو.'
          )
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
    setError('')
    try {
      const res = await withTimeout(
        upsertProfilePatch({ display_name: name.trim() }),
        8000,
        'saveName'
      )
      if (res.ok) setStatus(dict.nameSaved)
      else setError(res.reason || 'خطا در ذخیره')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره')
    }
  }

  const logout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      /* ignore */
    }
    window.location.href = '/auth'
  }

  if (loading) {
    return (
      <main dir={dir} className="min-h-screen flex flex-col items-center justify-center gap-3 px-4" style={{ color: 'var(--text)' }}>
        <p>{dict.loadingAccount}</p>
        <p className="text-xs text-[var(--muted)] text-center">{dict.loadingHint}</p>
        <Link href="/auth" className="text-sm text-[var(--accent)]">
          {dict.goLogin}
        </Link>
      </main>
    )
  }

  return (
    <main dir={dir} className="min-h-screen rtl px-4 py-10" style={{ color: 'var(--text)' }}>
      <div className="max-w-lg mx-auto card space-y-5">
        <div>
          <h1 className="text-xl font-bold">{dict.accountTitle} · WAIMA</h1>
          <p className="text-sm text-[var(--muted)]">{dict.brandTag} · {dict.brandSub}</p>
        </div>

        <div className="text-sm space-y-1">
          <p>
            {dict.email}: <span className="text-[var(--accent)]">{email || '—'}</span>
          </p>
          <p className="text-[var(--muted)]">{status}</p>
          {mapSummary && <p className="text-[var(--muted)]">{dict.lastMap}: {mapSummary}</p>}
          {error && (
            <p className="text-rose-300 text-sm leading-relaxed whitespace-pre-wrap border border-rose-500/30 rounded-xl p-3">
              {error}
            </p>
          )}
          {hint && (
            <p className="text-amber-200/90 text-xs leading-relaxed whitespace-pre-wrap border border-amber-500/30 rounded-xl p-3">
              {hint}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[var(--muted)]">{dict.displayName}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)]"
            style={{ color: 'var(--text)' }}
          />
          <button onClick={saveName} className="btn-primary px-4 py-2 text-sm">
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
          <button onClick={logout} className="btn-secondary px-4 py-2">
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
