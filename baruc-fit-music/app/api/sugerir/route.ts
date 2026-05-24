import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAcademiaToken, addToQueue } from '@/lib/spotify'
import { validarSugestao, mensagensRejeicao } from '@/lib/validacao'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { trackId, trackName, artistName, artistId, albumId, albumArt, durationMs, explicit, academiaSlug, alunoId } = body

    if (!trackId || !academiaSlug || !alunoId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const db = supabaseAdmin()

    const { data: academia } = await db
      .from('academias')
      .select('id')
      .eq('slug', academiaSlug)
      .single()

    if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

    // Verificar se aluno está suspenso (antes de qualquer validação)
    const { data: aluno } = await db
      .from('alunos')
      .select('suspenso, motivo_suspensao')
      .eq('id', alunoId)
      .eq('academia_id', academia.id)
      .single()

    if (aluno?.suspenso) {
      return NextResponse.json(
        { error: 'Sua conta está suspensa nesta academia. Entre em contato com a recepção.' },
        { status: 403 }
      )
    }

    const token = await getAcademiaToken(academia.id)

    const track = {
      id: trackId,
      name: trackName,
      artists: [{ id: artistId, name: artistName }],
      album: { id: albumId ?? '', images: [{ url: albumArt }] },
      duration_ms: durationMs,
      explicit: !!explicit,
    }

    const resultado = await validarSugestao(track, academia.id, alunoId, token)

    if (resultado.ok === false) {
      // Não logar tentativas de músicas já na fila (não é bloqueio real)
      if (resultado.motivo !== 'ja_na_fila') {
        await db.from('bloqueios_log').insert({
          academia_id: academia.id,
          aluno_id: alunoId,
          spotify_track_id: trackId,
          nome_musica: trackName,
          artista: artistName,
          genero_detectado: resultado.generoDetectado ?? null,
          motivo: resultado.motivo,
        })
      }
      return NextResponse.json(
        { error: mensagensRejeicao[resultado.motivo], motivo: resultado.motivo },
        { status: 422 }
      )
    }

    // Adicionar ao Spotify
    const queueResult = await addToQueue(`spotify:track:${trackId}`, token)
    if (!queueResult.ok) {
      const msg = queueResult.status === 404
        ? 'Nenhum player ativo no Spotify. Abra o Spotify e toque uma música primeiro.'
        : queueResult.status === 403
        ? 'A conta Spotify da academia precisa ser Premium para usar a fila.'
        : `Não foi possível adicionar à fila (erro ${queueResult.status}): ${queueResult.erro ?? ''}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    // Salvar na fila
    await db.from('fila_sugestoes').insert({
      academia_id: academia.id,
      aluno_id: alunoId,
      spotify_track_id: trackId,
      nome_musica: trackName,
      artista: artistName,
      capa_url: albumArt,
      duracao_ms: durationMs,
      status: 'na_fila',
      added_to_spotify_at: new Date().toISOString(),
    })

    // Incrementar contador do aluno
    const { error: rpcError } = await db.rpc('incrementar_sugestao', { p_aluno_id: alunoId })
    if (rpcError) {
      const { data: alunoAtual } = await db
        .from('alunos')
        .select('total_sugestoes_hoje')
        .eq('id', alunoId)
        .single()
      await db
        .from('alunos')
        .update({
          total_sugestoes_hoje: (alunoAtual?.total_sugestoes_hoje ?? 0) + 1,
          ultima_sugestao_em: new Date().toISOString(),
        })
        .eq('id', alunoId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
