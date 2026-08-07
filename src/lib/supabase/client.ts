import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/** فقط ریشه پروژه */
function normalizeSupabaseUrl(raw: string) {
  let url = (raw || '').trim().replace(/\/+$/, '')
  url = url.replace(/\/(rest|auth|storage|functions)\/v1.*$/i, '')
  return url
}

let browserClient: SupabaseClient | null = null

/**
 * کلاینت پایدار مرورگر — session در localStorage
 * (قابل‌اعتمادتر از cookie-only روی موبایل/Vercel)
 */
export function createClient(): SupabaseClient {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!url || !key) {
    throw new Error('Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  if (typeof window === 'undefined') {
    return createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  if (!browserClient) {
    browserClient = createSupabaseClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'waima-auth-v1',
        flowType: 'pkce',
      },
    })
  }
  return browserClient
}

export function isSupabaseConfigured() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  return Boolean(url && key)
}

/** صبر تا session از storage خوانده شود */
export async function waitForSession(maxMs = 2500) {
  const supabase = createClient()
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) return data.session
    await new Promise((r) => setTimeout(r, 120))
  }
  const { data } = await supabase.auth.getSession()
  return data.session
}
