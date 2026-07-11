import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  const alunoId = searchParams.get('alunoId')

  if (!itemId || !alunoId) {
    return NextResponse.json({ error: 'itemId e alunoId são obrigatórios' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Valida que o item pertence ao aluno antes de remover
  const { data: item } = await db
    .from('fila_sugestoes')
    .select('id, aluno_id, status')
    .eq('id', itemId)
    .eq('aluno_id', alunoId)
    .single()

  if (!item) {
    return NextResponse.json({ error: 'Sugestão não encontrada ou não pertence a você' }, { status: 403 })
  }

  if (item.status !== 'na_fila') {
    return NextResponse.json({ error: 'Essa música já foi tocada ou removida' }, { status: 409 })
  }

  await db.from('fila_sugestoes').update({ status: 'removida' }).eq('id', itemId)

  return NextResponse.json({ ok: true })
}
