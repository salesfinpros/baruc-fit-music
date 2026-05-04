import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode } from '@/lib/spotify'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const slug = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !slug) {
    return NextResponse.redirect(`${appUrl}/admin/${slug}?spotify=erro`)
  }

  try {
    const tokens = await exchangeCode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const db = supabaseAdmin()
    const { error: dbError } = await db
      .from('academias')
      .update({
        spotify_access_token: tokens.access_token,
        spotify_refresh_token: tokens.refresh_token,
        spotify_token_expires_at: expiresAt,
      })
      .eq('slug', slug)

    if (dbError) throw dbError

    return NextResponse.redirect(`${appUrl}/admin/${slug}?spotify=conectado`)
  } catch {
    return NextResponse.redirect(`${appUrl}/admin/${slug}?spotify=erro`)
  }
}
