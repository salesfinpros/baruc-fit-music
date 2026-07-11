import { NextRequest, NextResponse } from 'next/server'
import { getNowPlaying, getAcademiaToken } from '@/lib/spotify'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  try {
    const db = supabaseAdmin()
    const { data: academia } = await db
      .from('academias')
      .select('id, spotify_access_token')
      .eq('slug', slug)
      .single()

    if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })
    if (!academia.spotify_access_token)
      return NextResponse.json({ connected: false }, { status: 200 })

    const token = await getAcademiaToken(academia.id)
    const nowPlaying = await getNowPlaying(token)

    return NextResponse.json({ connected: true, nowPlaying })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
