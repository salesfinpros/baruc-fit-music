import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAcademiaToken, getNowPlaying } from '@/lib/spotify'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = supabaseAdmin()

  // Buscar todas as academias com Spotify conectado
  const { data: academias } = await db
    .from('academias')
    .select('id, slug, nome')
    .not('spotify_access_token', 'is', null)
    .not('spotify_refresh_token', 'is', null)

  if (!academias?.length) {
    return NextResponse.json({ ok: true, processadas: 0 })
  }

  const resultados: { academia: string; status: string }[] = []

  for (const academia of academias) {
    try {
      const token = await getAcademiaToken(academia.id)
      const nowPlaying = await getNowPlaying(token)

      // Nada tocando ou pausado — ignorar
      if (!nowPlaying?.isPlaying || !nowPlaying.id) {
        resultados.push({ academia: academia.slug, status: 'nada_tocando' })
        continue
      }

      // Buscar última música registrada para esta academia
      const { data: ultimo } = await db
        .from('historico_tocadas')
        .select('spotify_track_id')
        .eq('academia_id', academia.id)
        .order('tocada_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Já é a mesma música — não duplicar
      if (ultimo?.spotify_track_id === nowPlaying.id) {
        resultados.push({ academia: academia.slug, status: 'mesma_musica' })
        continue
      }

      // Verificar se estava na fila e marcar como tocada
      const { data: filaItem } = await db
        .from('fila_sugestoes')
        .select('id, aluno_id')
        .eq('academia_id', academia.id)
        .eq('spotify_track_id', nowPlaying.id)
        .eq('status', 'na_fila')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (filaItem) {
        await db.from('fila_sugestoes').update({ status: 'tocada' }).eq('id', filaItem.id)
      }

      // Registrar no histórico
      await db.from('historico_tocadas').insert({
        academia_id: academia.id,
        aluno_id: filaItem?.aluno_id ?? null,
        spotify_track_id: nowPlaying.id,
        nome_musica: nowPlaying.name,
        artista: nowPlaying.artist,
        capa_url: nowPlaying.albumArt ?? null,
        duracao_ms: nowPlaying.durationMs ?? null,
      })

      resultados.push({ academia: academia.slug, status: `registrado: ${nowPlaying.name}` })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'erro'
      resultados.push({ academia: academia.slug, status: `erro: ${msg}` })
    }
  }

  return NextResponse.json({ ok: true, processadas: academias.length, resultados })
}
