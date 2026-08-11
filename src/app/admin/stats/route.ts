
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = (process.env.ADMIN_SECRET || '').trim()
  const key = (req.headers.get('x-admin-key') || '').trim()
  if (!secret || key !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({
    status: 'ok',
    time: new Date().toISOString(),
    note: 'Connect Supabase service role here for live user metrics when ready.',
    env: {
      hasSupabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSamba: Boolean(process.env.SAMBANOVA_API_KEY),
    },
  })
}
