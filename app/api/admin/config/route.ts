import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const db = supabaseAdmin()
  const { data } = await db
    .from('config_academia')
    .select('*, academias!inner(slug)')
    .eq('academias.slug', session.academiaSlug)
    .single()

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', session.academiaSlug)
    .single()

  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const campos: Record<string, unknown> = {}
  if (Array.isArray(body.generos_bloqueados)) campos.generos_bloqueados = body.generos_bloqueados
  if (Array.isArray(body.musicas_bloqueadas)) campos.musicas_bloqueadas = body.musicas_bloqueadas
  if (Array.isArray(body.albuns_bloqueados)) campos.albuns_bloqueados = body.albuns_bloqueados
  if (Array.isArray(body.artistas_bloqueados)) campos.artistas_bloqueados = body.artistas_bloqueados
  if (typeof body.limite_sugestoes_aluno_por_dia === 'number')
    campos.limite_sugestoes_aluno_por_dia = body.limite_sugestoes_aluno_por_dia
  if (typeof body.duracao_maxima_ms === 'number') campos.duracao_maxima_ms = body.duracao_maxima_ms
  if (typeof body.bloquear_explicitas === 'boolean')
    campos.bloquear_explicitas = body.bloquear_explicitas

  const { error } = await db
    .from('config_academia')
    .update(campos)
    .eq('academia_id', academia.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
