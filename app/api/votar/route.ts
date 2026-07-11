import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { filaItemId, alunoId } = await req.json()
  if (!filaItemId || !alunoId) {
    return NextResponse.json({ error: 'filaItemId e alunoId são obrigatórios' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: item } = await db
    .from('fila_sugestoes')
    .select('id, academia_id, status, aluno_id')
    .eq('id', filaItemId)
    .eq('status', 'na_fila')
    .single()

  if (!item) return NextResponse.json({ error: 'Música não encontrada na fila' }, { status: 404 })
  if (item.aluno_id === alunoId) {
    return NextResponse.json({ error: 'Você não pode votar na sua própria sugestão' }, { status: 400 })
  }

  const { error } = await db.from('votos').insert({
    fila_item_id: filaItemId,
    aluno_id: alunoId,
    academia_id: item.academia_id,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Você já votou nessa música' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await db.rpc('incrementar_votos', { p_fila_item_id: filaItemId })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const filaItemId = searchParams.get('filaItemId')
  const alunoId = searchParams.get('alunoId')

  if (!filaItemId || !alunoId) {
    return NextResponse.json({ error: 'filaItemId e alunoId são obrigatórios' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { count, error } = await db
    .from('votos')
    .delete({ count: 'exact' })
    .eq('fila_item_id', filaItemId)
    .eq('aluno_id', alunoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (count && count > 0) {
    await db.rpc('decrementar_votos', { p_fila_item_id: filaItemId })
  }

  return NextResponse.json({ ok: true })
}
