import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { academiaSlug, alunoId, texto } = await req.json()

  if (!academiaSlug || !texto?.trim()) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  if (texto.trim().length > 500) {
    return NextResponse.json({ error: 'Texto muito longo' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', academiaSlug)
    .single()

  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  await db.from('sugestoes_melhoria').insert({
    academia_id: academia.id,
    aluno_id: alunoId ?? null,
    texto: texto.trim(),
  })

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')

  if (!slug || session.academiaSlug !== slug) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const { data } = await db
    .from('sugestoes_melhoria')
    .select('*, alunos(nome)')
    .eq('academia_id', academia.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return NextResponse.json({ sugestoes: data ?? [] })
}
