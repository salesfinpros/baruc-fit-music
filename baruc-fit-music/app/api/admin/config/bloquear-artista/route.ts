import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getAcademiaToken, searchArtists } from '@/lib/spotify'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { artistaNome } = await req.json()
  if (!artistaNome?.trim()) return NextResponse.json({ error: 'Nome do artista obrigatório' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', session.academiaSlug)
    .single()
  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const { data: config } = await db
    .from('config_academia')
    .select('artistas_bloqueados')
    .eq('academia_id', academia.id)
    .single()
  if (!config) return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })

  const token = await getAcademiaToken(academia.id)
  const resultados = await searchArtists(artistaNome.trim(), token)
  const artista = resultados[0]

  if (!artista) return NextResponse.json({ error: 'Artista não encontrado no Spotify' }, { status: 404 })

  const existing: string[] = config.artistas_bloqueados ?? []
  const jaExiste = existing.some(e => { try { return JSON.parse(e).id === artista.id } catch { return false } })

  if (!jaExiste) {
    const entry = JSON.stringify({ id: artista.id, nome: artista.name })
    const updated = [...existing, entry]
    await db.from('config_academia').update({ artistas_bloqueados: updated }).eq('academia_id', academia.id)
  }

  return NextResponse.json({
    ok: true,
    artista: {
      id: artista.id,
      nome: artista.name,
      imagemUrl: artista.images[1]?.url ?? artista.images[0]?.url ?? null,
      jaExistia: jaExiste,
    },
  })
}
