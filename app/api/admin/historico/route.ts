import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'

type Periodo = 'hoje' | '7dias' | '30dias'

function getDataInicio(periodo: Periodo): string {
  const now = new Date()
  if (periodo === 'hoje') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  const dias = periodo === '7dias' ? 7 : 30
  return new Date(now.getTime() - dias * 24 * 60 * 60 * 1000).toISOString()
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') ?? session.academiaSlug
  const periodo = (searchParams.get('periodo') ?? '30dias') as Periodo
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = 20

  if (session.academiaSlug !== slug) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const db = supabaseAdmin()
  const { data: academia } = await db.from('academias').select('id').eq('slug', slug).single()
  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const dataInicio = getDataInicio(periodo)
  const offset = (page - 1) * perPage

  const [historicoRes, topAllRes, countRes] = await Promise.all([
    db
      .from('historico_tocadas')
      .select('*, alunos(nome)')
      .eq('academia_id', academia.id)
      .gte('tocada_em', dataInicio)
      .order('tocada_em', { ascending: false })
      .range(offset, offset + perPage - 1),
    db
      .from('historico_tocadas')
      .select('spotify_track_id, nome_musica, artista, capa_url')
      .eq('academia_id', academia.id)
      .gte('tocada_em', dataInicio),
    db
      .from('historico_tocadas')
      .select('id', { count: 'exact', head: true })
      .eq('academia_id', academia.id)
      .gte('tocada_em', dataInicio),
  ])

  // Agrupa por track para calcular top músicas
  const contagem: Record<string, { nome_musica: string; artista: string; capa_url: string | null; count: number }> = {}
  for (const item of topAllRes.data ?? []) {
    if (!contagem[item.spotify_track_id]) {
      contagem[item.spotify_track_id] = {
        nome_musica: item.nome_musica,
        artista: item.artista,
        capa_url: item.capa_url,
        count: 0,
      }
    }
    contagem[item.spotify_track_id].count++
  }

  const topMusicas = Object.entries(contagem)
    .map(([id, v]) => ({ spotify_track_id: id, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const total = countRes.count ?? 0

  return NextResponse.json({
    historico: historicoRes.data ?? [],
    topMusicas,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  })
}
