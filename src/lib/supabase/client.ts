import { createBrowserClient } from '@supabase/ssr'

/** فقط ریشه پروژه — بدون /rest/v1 یا /auth/v1 */
function normalizeSupabaseUrl(raw: string) {
  let url = (raw || '').trim().replace(/\/+$/, '')
  // اگر اشتباهاً مسیر اضافه شده بود
  url = url.replace(/\/(rest|auth|storage|functions)\/v1.*$/i, '')
  return url
}

export function createClient() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!url || !key) {
    throw new Error('Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  if (!url.includes('supabase.co') && !url.includes('supabase.in')) {
    // هشدار منطقی — بعضی self-hostها هم هستند؛ ولی معمولاً supabase.co است
    console.warn('Supabase URL unusual:', url)
  }

  return createBrowserClient(url, key)
}

export function isSupabaseConfigured() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  return Boolean(url && key)
}
