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

// Gêneros padrão para novas academias
export const GENEROS_PADRAO = [
  'funk',
  'funk ostentacao',
  'piseiro',
  'forro',
  'pagode',
  'axe',
  'brega',
  'sertanejo universitario',
]

// Remove acentos e normaliza para comparação robusta com gêneros do Spotify
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter(c => c.charCodeAt(0) < 0x0300 || c.charCodeAt(0) > 0x036f)
    .join('')
    .trim()
}

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

  // 7. Gênero do artista via Spotify API — ANTES do limite do aluno
  // Músicas de gênero bloqueado devem ser rejeitadas sem consumir a cota diária
  if (artistId && config.generos_bloqueados?.length) {
    const generosSpotify = await getArtistGenres(artistId, spotifyToken)
    const generosNormalizados = (config.generos_bloqueados as string[]).map(normalizar)

    // Retorna o gênero ORIGINAL do Spotify (sem normalizar) para salvar no log
    const generoOriginalBloqueado = generosSpotify.find(g =>
      generosNormalizados.some(bloqueado => normalizar(g).includes(bloqueado))
    )

    if (generoOriginalBloqueado) {
      return { ok: false, motivo: 'genero_bloqueado', generoDetectado: generoOriginalBloqueado }
    }
  }

  // 8. Limite diário do aluno — último critério
  if ((aluno?.total_sugestoes_hoje ?? 0) >= config.limite_sugestoes_aluno_por_dia) {
    return { ok: false, motivo: 'limite_aluno' }
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
