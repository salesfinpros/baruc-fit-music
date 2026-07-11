import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// PATCH /api/admin/alunos/[alunoId]/suspender — suspender aluno
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ alunoId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { alunoId } = await params
  const { motivo } = await req.json()

  if (!motivo?.trim()) {
    return NextResponse.json({ error: 'Motivo da suspensão é obrigatório' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', session.academiaSlug)
    .single()

  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const { error } = await db
    .from('alunos')
    .update({
      suspenso: true,
      motivo_suspensao: motivo.trim(),
      suspenso_em: new Date().toISOString(),
      suspenso_por: session.academiaSlug,
    })
    .eq('id', alunoId)
    .eq('academia_id', academia.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/alunos/[alunoId]/suspender — reativar aluno
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ alunoId: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { alunoId } = await params

  const db = supabaseAdmin()

  const { data: academia } = await db
    .from('academias')
    .select('id')
    .eq('slug', session.academiaSlug)
    .single()

  if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

  const { error } = await db
    .from('alunos')
    .update({
      suspenso: false,
      motivo_suspensao: null,
      suspenso_em: null,
      suspenso_por: null,
    })
    .eq('id', alunoId)
    .eq('academia_id', academia.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
