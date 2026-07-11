import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getAcademiaToken, searchArtists } from '@/lib/spotify'

async function adicionarArtistaEmAcademia(db: ReturnType<typeof supabaseAdmin>, academiaId: string, entry: string) {
  const { data: config } = await db
    .from('config_academia')
    .select('artistas_bloqueados')
    .eq('academia_id', academiaId)
    .single()
  if (!config) return

  const existing: string[] = config.artistas_bloqueados ?? []
  const artistaId = (() => { try { return JSON.parse(entry).id } catch { return null } })()
  const jaExiste = artistaId && existing.some(e => { try { return JSON.parse(e).id === artistaId } catch { return false } })
  if (!jaExiste) {
    await db.from('config_academia').update({ artistas_bloqueados: [...existing, entry] }).eq('academia_id', academiaId)
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { artistaNome, aplicarRede } = await req.json()
  if (!artistaNome?.trim()) return NextResponse.json({ error: 'Nome do artista obrigatório' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id, rede_id')
    .eq('slug', session.academiaSlug)
    .single()
  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const token = await getAcademiaToken(academia.id)
  const resultados = await searchArtists(artistaNome.trim(), token)
  const artista = resultados[0]

  if (!artista) return NextResponse.json({ error: 'Artista não encontrado no Spotify' }, { status: 404 })

  const entry = JSON.stringify({ id: artista.id, nome: artista.name })

  // Bloquear na academia atual
  await adicionarArtistaEmAcademia(db, academia.id, entry)

  // Propagar para a rede se solicitado
  let propagadas = 0
  if (aplicarRede && academia.rede_id) {
    const { data: outrasAcademias } = await db
      .from('academias')
      .select('id')
      .eq('rede_id', academia.rede_id)
      .neq('id', academia.id)

    for (const outra of outrasAcademias ?? []) {
      await adicionarArtistaEmAcademia(db, outra.id, entry)
      propagadas++
    }
  }

  return NextResponse.json({
    ok: true,
    artista: {
      id: artista.id,
      nome: artista.name,
      imagemUrl: artista.images[1]?.url ?? artista.images[0]?.url ?? null,
    },
    propagadas,
  })
}
