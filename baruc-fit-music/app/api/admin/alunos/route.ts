import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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
    // Remover aluno específico
    await db.from('fila_sugestoes').delete().eq('aluno_id', alunoId).eq('academia_id', academia.id)
    await db.from('alunos').delete().eq('id', alunoId).eq('academia_id', academia.id)
  } else {
    // Remover todos os alunos da academia
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
