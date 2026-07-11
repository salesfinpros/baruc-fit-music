import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = supabaseAdmin()

  // Limpar músicas que ficaram na fila sem tocar
  const { error: erroFila } = await db
    .from('fila_sugestoes')
    .update({ status: 'removida' })
    .eq('status', 'na_fila')

  // Resetar contador diário de sugestões dos alunos
  const { error: erroAlunos } = await db
    .from('alunos')
    .update({ total_sugestoes_hoje: 0 })
    .gt('total_sugestoes_hoje', 0)

  if (erroFila || erroAlunos) {
    return NextResponse.json(
      { error: 'Erro no reset', erroFila, erroAlunos },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, resetAt: new Date().toISOString() })
}
