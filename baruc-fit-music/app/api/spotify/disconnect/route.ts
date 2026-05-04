import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const db = supabaseAdmin()
  await db
    .from('academias')
    .update({
      spotify_access_token: null,
      spotify_refresh_token: null,
      spotify_token_expires_at: null,
    })
    .eq('slug', session.academiaSlug)

  return NextResponse.json({ ok: true })
}
