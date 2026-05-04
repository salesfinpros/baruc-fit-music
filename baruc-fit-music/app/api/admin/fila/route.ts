import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE /api/admin/fila?itemId=xxx — remover item da fila
export async function DELETE(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId obrigatório' }, { status: 400 })

  const db = supabaseAdmin()

  // Garantir que o item pertence à academia do admin
  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', session.academiaSlug)
    .single()

  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const { error } = await db
    .from('fila_sugestoes')
    .update({ status: 'removida' })
    .eq('id', itemId)
    .eq('academia_id', academia.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
