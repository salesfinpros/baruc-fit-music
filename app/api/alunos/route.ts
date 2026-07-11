import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { limparTelefone } from '@/lib/telefone'

// POST /api/alunos — recuperar ou criar aluno
//
// Ordem de busca (para impedir bypass de limite trocando nome/telefone):
//   1. CPF  → identificador primário
//   2. Telefone → impede bypass com CPF novo + mesmo telefone
//   3. Criar novo aluno (apenas se CPF e telefone são genuinamente novos)
//
// Se aluno for encontrado por telefone e não tiver CPF ainda, o CPF é vinculado
// automaticamente — assim futuras tentativas com telefone diferente ainda são barradas.
export async function POST(req: NextRequest) {
  try {
    const { nome, cpf, telefone, academiaSlug } = await req.json()

    if (!nome?.trim() || !telefone || !academiaSlug) {
      return NextResponse.json({ error: 'Nome, telefone e academia são obrigatórios' }, { status: 400 })
    }

    const telefoneLimpo = limparTelefone(telefone)
    if (telefoneLimpo.length < 10) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
    }

    const db = supabaseAdmin()

    const { data: academia } = await db
      .from('academias')
      .select('id')
      .eq('slug', academiaSlug)
      .single()

    if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

    const cpfFormatado = cpf?.trim() && cpf.replace(/\D/g, '').length === 11 ? cpf.trim() : null

    // 1. Busca por CPF (identificador primário)
    if (cpfFormatado) {
      const { data: porCPF } = await db
        .from('alunos')
        .select('id, nome')
        .eq('academia_id', academia.id)
        .eq('cpf', cpfFormatado)
        .maybeSingle()

      if (porCPF) {
        return NextResponse.json({ id: porCPF.id, nome: porCPF.nome, novo: false })
      }
    }

    // 2. Busca por telefone — sempre, mesmo quando CPF foi fornecido
    // Impede que aluno burle o limite registrando com CPF novo no mesmo telefone,
    // ou com CPF diferente + mesmo telefone.
    const { data: porTelefone } = await db
      .from('alunos')
      .select('id, nome, cpf')
      .eq('academia_id', academia.id)
      .eq('telefone', telefoneLimpo)
      .maybeSingle()

    if (porTelefone) {
      // Vincular CPF ao registro existente se ele ainda não tem um
      // (migração de alunos cadastrados antes do CPF ser adicionado)
      if (cpfFormatado && !porTelefone.cpf) {
        await db
          .from('alunos')
          .update({ cpf: cpfFormatado })
          .eq('id', porTelefone.id)
          .eq('academia_id', academia.id)
      }
      return NextResponse.json({ id: porTelefone.id, nome: porTelefone.nome, novo: false })
    }

    // 3. CPF e telefone são genuinamente novos — criar aluno
    const { data: novo, error } = await db
      .from('alunos')
      .insert({
        academia_id: academia.id,
        nome: nome.trim(),
        telefone: telefoneLimpo,
        ...(cpfFormatado ? { cpf: cpfFormatado } : {}),
      })
      .select('id, nome')
      .single()

    if (error) {
      // Condição de corrida: outro insert ganhou — buscar o registro já existente
      if (error.code === '23505') {
        const { data: existente } = await db
          .from('alunos')
          .select('id, nome')
          .eq('academia_id', academia.id)
          .eq('telefone', telefoneLimpo)
          .maybeSingle()
        if (existente) return NextResponse.json({ id: existente.id, nome: existente.nome, novo: false })
        return NextResponse.json({ error: 'Dados já cadastrados nesta academia.' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ id: novo.id, nome: novo.nome, novo: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
