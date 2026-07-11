import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

// Mescla src em dst sem duplicatas.
// Artistas/álbuns são JSON strings — compara pelo campo "id" interno.
// Gêneros/músicas são strings simples — compara por igualdade.
function mesclarArray(dst: string[], src: string[], tipoJson: boolean): string[] {
  const resultado = [...dst]
  for (const item of src) {
    if (tipoJson) {
      const itemId = (() => { try { return JSON.parse(item).id } catch { return null } })()
      if (!itemId) continue
      const existe = resultado.some(e => { try { return JSON.parse(e).id === itemId } catch { return false } })
      if (!existe) resultado.push(item)
    } else {
      if (!resultado.includes(item)) resultado.push(item)
    }
  }
  return resultado
}

export async function POST() {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const db = supabaseAdmin()

  // Buscar academia atual com rede_id
  const { data: academiaAtual } = await db
    .from('academias')
    .select('id, rede_id')
    .eq('slug', session.academiaSlug)
    .single()

  if (!academiaAtual?.rede_id) {
    return NextResponse.json({ error: 'Esta academia não pertence a nenhuma rede' }, { status: 400 })
  }

  // Buscar config atual
  const { data: configAtual } = await db
    .from('config_academia')
    .select('artistas_bloqueados, albuns_bloqueados, generos_bloqueados, musicas_bloqueadas')
    .eq('academia_id', academiaAtual.id)
    .single()

  if (!configAtual) return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 })

  // Buscar todas as outras academias da mesma rede
  const { data: outrasAcademias } = await db
    .from('academias')
    .select('id')
    .eq('rede_id', academiaAtual.rede_id)
    .neq('id', academiaAtual.id)

  if (!outrasAcademias?.length) {
    return NextResponse.json({ ok: true, atualizadas: 0, mensagem: 'Nenhuma outra academia na rede' })
  }

  let atualizadas = 0

  for (const outra of outrasAcademias) {
    const { data: configOutra } = await db
      .from('config_academia')
      .select('artistas_bloqueados, albuns_bloqueados, generos_bloqueados, musicas_bloqueadas')
      .eq('academia_id', outra.id)
      .single()

    if (!configOutra) continue

    const merged = {
      artistas_bloqueados: mesclarArray(configOutra.artistas_bloqueados ?? [], configAtual.artistas_bloqueados ?? [], true),
      albuns_bloqueados: mesclarArray(configOutra.albuns_bloqueados ?? [], configAtual.albuns_bloqueados ?? [], true),
      generos_bloqueados: mesclarArray(configOutra.generos_bloqueados ?? [], configAtual.generos_bloqueados ?? [], false),
      musicas_bloqueadas: mesclarArray(configOutra.musicas_bloqueadas ?? [], configAtual.musicas_bloqueadas ?? [], false),
    }

    await db.from('config_academia').update(merged).eq('academia_id', outra.id)
    atualizadas++
  }

  return NextResponse.json({ ok: true, atualizadas })
}
