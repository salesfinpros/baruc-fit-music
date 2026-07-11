import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })
  if (session.academiaSlug !== slug) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const db = supabaseAdmin()
  const { data: academia } = await db.from('academias').select('id').eq('slug', slug).single()
  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await db
    .from('historico_tocadas')
    .select('*, alunos(nome)')
    .eq('academia_id', academia.id)
    .gte('tocada_em', trintaDiasAtras)
    .order('tocada_em', { ascending: false })
    .limit(300)

  return NextResponse.json({ historico: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { slug, track } = await req.json()
  if (!slug || !track?.id) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  if (session.academiaSlug !== slug) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const db = supabaseAdmin()
  const { data: academia } = await db.from('academias').select('id').eq('slug', slug).single()
  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  // Verifica se essa música estava na fila e a marca como tocada
  const { data: filaItem } = await db
    .from('fila_sugestoes')
    .select('id, aluno_id')
    .eq('academia_id', academia.id)
    .eq('spotify_track_id', track.id)
    .eq('status', 'na_fila')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (filaItem) {
    await db.from('fila_sugestoes').update({ status: 'tocada' }).eq('id', filaItem.id)
  }

  await db.from('historico_tocadas').insert({
    academia_id: academia.id,
    aluno_id: filaItem?.aluno_id ?? null,
    spotify_track_id: track.id,
    nome_musica: track.name,
    artista: track.artist,
    capa_url: track.albumArt ?? null,
    duracao_ms: track.durationMs ?? null,
  })

  return NextResponse.json({ ok: true })
}
