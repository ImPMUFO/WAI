'use client'

import { useEffect, useState } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import {
  USERNAME_CHANGE_DAILY_LIMIT,
  USERNAME_HELP,
  validateUsername,
} from '@/lib/username'

export default function UsernameEditor() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [left, setLeft] = useState(USERNAME_CHANGE_DAILY_LIMIT)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) return
    const { data } = await supabase
      .from('profiles')
      .select('username, username_changed_on, username_change_count')
      .eq('id', u.user.id)
      .maybeSingle()
    const today = new Date().toISOString().slice(0, 10)
    const count =
      data?.username_changed_on === today ? Number(data?.username_change_count || 0) : 0
    setCurrent(data?.username || '')
    setNext(data?.username || '')
    setLeft(Math.max(0, USERNAME_CHANGE_DAILY_LIMIT - count))
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setMsg('')
    const v = validateUsername(next)
    if (!v.ok) {
      setMsg(v.error)
      return
    }
    if (v.value === current) {
      setMsg('همان آیدی فعلی است.')
      return
    }
    if (left <= 0) {
      setMsg('سقف تغییر روزانه (۵ بار) پر شده.')
      return
    }
    if (!isSupabaseConfigured()) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return

      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', v.value)
        .maybeSingle()
      if (taken?.id && taken.id !== u.user.id) {
        setMsg('این آیدی قبلاً گرفته شده.')
        return
      }

      const today = new Date().toISOString().slice(0, 10)
      const { data: prev } = await supabase
        .from('profiles')
        .select('username_changed_on, username_change_count')
        .eq('id', u.user.id)
        .maybeSingle()
      const count =
        prev?.username_changed_on === today ? Number(prev?.username_change_count || 0) + 1 : 1

      const { error } = await supabase.from('profiles').upsert({
        id: u.user.id,
        username: v.value,
        username_changed_on: today,
        username_change_count: count,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      setCurrent(v.value)
      setLeft(Math.max(0, USERNAME_CHANGE_DAILY_LIMIT - count))
      setMsg('آیدی ذخیره شد.')
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'خطا')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card space-y-2">
      <p className="text-sm font-medium">آیدی من</p>
      <p className="text-[11px] text-[var(--muted)]">فعلی: <span className="font-mono text-[var(--accent)]">{current || '—'}</span></p>
      <input
        value={next}
        onChange={(e) => setNext(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
        className="w-full rounded-xl px-4 py-3 border border-[var(--border)] bg-[var(--card)] font-mono"
        style={{ color: 'var(--text)' }}
        maxLength={20}
      />
      <p className="text-[11px] text-[var(--muted)] leading-relaxed">{USERNAME_HELP}</p>
      <p className="text-[11px] text-[var(--muted)]">تغییر باقی‌مانده امروز: {left} از {USERNAME_CHANGE_DAILY_LIMIT}</p>
      {msg && <p className="text-xs text-[var(--accent)]">{msg}</p>}
      <button type="button" disabled={loading} onClick={() => void save()} className="btn-secondary px-4 py-2 text-sm">
        ذخیره آیدی
      </button>
    </div>
  )
}
