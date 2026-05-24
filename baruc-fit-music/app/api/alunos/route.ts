import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { limparTelefone } from '@/lib/telefone'

// POST /api/alunos — criar ou recuperar aluno por CPF (primário) ou telefone (fallback)
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

    // Busca por CPF primeiro (se fornecido e válido)
    if (cpf?.trim()) {
      const cpfLimpo = cpf.replace(/\D/g, '')
      if (cpfLimpo.length === 11) {
        const { data: existenteCPF } = await db
          .from('alunos')
          .select('id, nome')
          .eq('academia_id', academia.id)
          .eq('cpf', cpf.trim())
          .maybeSingle()

        if (existenteCPF) {
          return NextResponse.json({ id: existenteCPF.id, nome: existenteCPF.nome, novo: false })
        }

        // Criar novo aluno com CPF
        const { data: novo, error } = await db
          .from('alunos')
          .insert({
            academia_id: academia.id,
            nome: nome.trim(),
            telefone: telefoneLimpo,
            cpf: cpf.trim(),
          })
          .select('id, nome')
          .single()

        if (error) {
          if (error.code === '23505') {
            return NextResponse.json({ error: 'CPF já cadastrado nesta academia.' }, { status: 409 })
          }
          throw error
        }

        return NextResponse.json({ id: novo.id, nome: novo.nome, novo: true })
      }
    }

    // Fallback: busca por telefone (alunos sem CPF ou acesso pelo localStorage antigo)
    const { data: existente } = await db
      .from('alunos')
      .select('id, nome')
      .eq('academia_id', academia.id)
      .eq('telefone', telefoneLimpo)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ id: existente.id, nome: existente.nome, novo: false })
    }

    // Criar novo aluno sem CPF
    const { data: novo, error } = await db
      .from('alunos')
      .insert({ academia_id: academia.id, nome: nome.trim(), telefone: telefoneLimpo })
      .select('id, nome')
      .single()

    if (error) throw error

    return NextResponse.json({ id: novo.id, nome: novo.nome, novo: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
