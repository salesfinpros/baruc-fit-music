import { NextRequest, NextResponse } from 'next/server'
import { criarTokenAdmin, ADMIN_COOKIE } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { senha, slug } = await req.json()

    if (!senha || !slug) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    if (senha !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })
    }

    // Verificar se academia existe
    const db = supabaseAdmin()
    const { data: academia } = await db
      .from('academias')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!academia) {
      return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })
    }

    const token = await criarTokenAdmin(slug)

    const res = NextResponse.json({ ok: true })
    res.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 horas
      path: '/',
    })

    return res
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(ADMIN_COOKIE)
  return res
}
