import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const PAGE_SIZE = 20

// GET /api/admin/alunos?page=1&q=busca — lista paginada de alunos
export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const q = searchParams.get('q')?.trim() ?? ''

  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', session.academiaSlug)
    .single()

  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  let query = db
    .from('alunos')
    .select('id, nome, telefone, cpf, total_sugestoes_hoje, suspenso, motivo_suspensao, suspenso_em, created_at', { count: 'exact' })
    .eq('academia_id', academia.id)
    .order('nome', { ascending: true })

  if (q) {
    query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%,cpf.ilike.%${q}%`)
  }

  const { data, count, error } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    alunos: data ?? [],
    total: count ?? 0,
    pagina: page,
    totalPaginas: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  })
}

// DELETE /api/admin/alunos?alunoId=xxx — remover aluno e seus dados (LGPD)
export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const alunoId = searchParams.get('alunoId')

  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', session.academiaSlug)
    .single()

  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  if (alunoId) {
    await db.from('fila_sugestoes').delete().eq('aluno_id', alunoId).eq('academia_id', academia.id)
    await db.from('alunos').delete().eq('id', alunoId).eq('academia_id', academia.id)
  } else {
    const { data: alunos } = await db
      .from('alunos')
      .select('id')
      .eq('academia_id', academia.id)

    if (alunos?.length) {
      const ids = alunos.map(a => a.id)
      await db.from('fila_sugestoes').delete().in('aluno_id', ids)
      await db.from('alunos').delete().eq('academia_id', academia.id)
    }
  }

  return NextResponse.json({ ok: true })
}
