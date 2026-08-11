
'use client'

import { useState } from 'react'
import { useLocale } from '@/lib/i18n/LocaleProvider'

export default function AdminPage() {
  const { dir, locale } = useLocale()
  const [key, setKey] = useState('')
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  const [stats, setStats] = useState<any>(null)

  const unlock = async () => {
    setErr('')
    try {
      const r = await fetch('/api/admin/stats', { headers: { 'x-admin-key': key } })
      const j = await r.json()
      if (!r.ok) {
        setErr(j.error || 'Unauthorized')
        setOk(false)
        return
      }
      setStats(j)
      setOk(true)
    } catch {
      setErr('Network error')
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto" dir={dir} style={{ color: 'var(--text)' }}>
      <h1 className="text-xl font-bold mb-2">{locale === 'en' ? 'WAIMA Admin' : 'مدیریت WAIMA'}</h1>
      <p className="text-sm text-[var(--muted)] mb-4">
        {locale === 'en'
          ? 'Requires ADMIN_SECRET on the server. Keep this private.'
          : 'نیازمند ADMIN_SECRET روی سرور. خصوصی نگه دارید.'}
      </p>
      {!ok ? (
        <div className="card space-y-3">
          <input type="password" className="w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Admin key" />
          <button type="button" className="btn-primary px-4 py-2" onClick={() => void unlock()}>
            {locale === 'en' ? 'Unlock' : 'ورود'}
          </button>
          {err && <p className="text-sm text-rose-400">{err}</p>}
        </div>
      ) : (
        <div className="card space-y-2 text-sm">
          <p><strong>status:</strong> {stats?.status}</p>
          <p><strong>time:</strong> {stats?.time}</p>
          <p className="text-[var(--muted)]">{stats?.note}</p>
          <pre className="text-[10px] overflow-auto opacity-70">{JSON.stringify(stats, null, 2)}</pre>
        </div>
      )}
    </main>
  )
}
