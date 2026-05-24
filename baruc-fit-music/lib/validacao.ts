import { supabaseAdmin } from './supabase'
import { getArtistGenres, SpotifyTrack } from './spotify'

export type MotivoRejeicao =
  | 'musica_bloqueada'
  | 'album_bloqueado'
  | 'artista_bloqueado'
  | 'musica_explicita'
  | 'duracao_excedida'
  | 'ja_na_fila'
  | 'limite_aluno'
  | 'genero_bloqueado'

export type ResultadoValidacao =
  | { ok: true }
  | { ok: false; motivo: MotivoRejeicao; generoDetectado?: string }

export async function validarSugestao(
  track: SpotifyTrack,
  academiaId: string,
  alunoId: string,
  spotifyToken: string
): Promise<ResultadoValidacao> {
  const db = supabaseAdmin()

  const [{ data: config }, { data: aluno }, { data: naFila }] = await Promise.all([
    db.from('config_academia').select('*').eq('academia_id', academiaId).single(),
    db.from('alunos').select('total_sugestoes_hoje').eq('id', alunoId).single(),
    db
      .from('fila_sugestoes')
      .select('id')
      .eq('academia_id', academiaId)
      .eq('spotify_track_id', track.id)
      .eq('status', 'na_fila')
      .maybeSingle(),
  ])

  if (!config) return { ok: false, motivo: 'musica_bloqueada' }

  // 1. Música na blacklist
  if (config.musicas_bloqueadas?.includes(track.id)) {
    return { ok: false, motivo: 'musica_bloqueada' }
  }

  // 2. Álbum na blacklist
  if (track.album.id && config.albuns_bloqueados?.length) {
    const albumBloqueado = config.albuns_bloqueados.some((entry: string) => {
      try { return JSON.parse(entry).id === track.album.id } catch { return false }
    })
    if (albumBloqueado) return { ok: false, motivo: 'album_bloqueado' }
  }

  // 3. Artista na blacklist
  const artistId = track.artists[0]?.id
  if (artistId && config.artistas_bloqueados?.length) {
    const artistaBloqueado = config.artistas_bloqueados.some((entry: string) => {
      try { return JSON.parse(entry).id === artistId } catch { return false }
    })
    if (artistaBloqueado) return { ok: false, motivo: 'artista_bloqueado' }
  }

  // 4. Conteúdo explícito
  if (config.bloquear_explicitas && track.explicit) {
    return { ok: false, motivo: 'musica_explicita' }
  }

  // 5. Duração máxima
  if (track.duration_ms > config.duracao_maxima_ms) {
    return { ok: false, motivo: 'duracao_excedida' }
  }

  // 6. Já na fila → bloquear duplicata
  if (naFila) {
    return { ok: false, motivo: 'ja_na_fila' }
  }

  // 7. Limite diário do aluno
  if ((aluno?.total_sugestoes_hoje ?? 0) >= config.limite_sugestoes_aluno_por_dia) {
    return { ok: false, motivo: 'limite_aluno' }
  }

  // 8. Gênero do artista via Spotify API
  if (artistId && config.generos_bloqueados?.length) {
    const genres = await getArtistGenres(artistId, spotifyToken)
    const bloqueado = config.generos_bloqueados.find((g: string) =>
      genres.some((genre: string) => genre.toLowerCase().includes(g.toLowerCase()))
    )
    if (bloqueado) {
      const generoDetectado = genres.find((g: string) =>
        g.toLowerCase().includes(bloqueado.toLowerCase())
      )
      return { ok: false, motivo: 'genero_bloqueado', generoDetectado: generoDetectado ?? bloqueado }
    }
  }

  return { ok: true }
}

export const mensagensRejeicao: Record<MotivoRejeicao, string> = {
  musica_bloqueada: 'Essa música está na lista de bloqueios da academia.',
  album_bloqueado: 'Músicas desse álbum não são permitidas nesta academia.',
  artista_bloqueado: 'Músicas desse artista não são permitidas nesta academia.',
  musica_explicita: 'Músicas com conteúdo explícito não são permitidas aqui.',
  duracao_excedida: 'Essa música ultrapassa o limite de duração permitido.',
  ja_na_fila: 'Essa música já está na fila. Aguarde ela tocar!',
  limite_aluno: 'Você atingiu o limite diário de sugestões. Tente novamente amanhã.',
  genero_bloqueado: 'Esse gênero musical não é permitido nesta academia.',
}
