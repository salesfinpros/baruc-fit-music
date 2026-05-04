import { createClient, SupabaseClient } from '@supabase/supabase-js'

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase env vars não configuradas')
  return createClient(url, anon)
}

// Client público (anon) — lazy para evitar erro no build sem .env
let _supabase: SupabaseClient | null = null
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!_supabase) _supabase = getSupabaseClient()
    return (_supabase as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Client admin (service key) — usar apenas em API Routes
export const supabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_KEY
  if (!url || !service) throw new Error('Supabase admin env vars não configuradas')
  return createClient(url, service)
}

// ----------------------------------------------------------------
// Tipos das tabelas
// ----------------------------------------------------------------
export type Academia = {
  id: string
  nome: string
  slug: string
  spotify_access_token: string | null
  spotify_refresh_token: string | null
  spotify_token_expires_at: string | null
  ativo: boolean
  created_at: string
}

export type Aluno = {
  id: string
  academia_id: string
  nome: string
  telefone: string
  total_sugestoes_hoje: number
  ultima_sugestao_em: string | null
  created_at: string
}

export type FilaSugestao = {
  id: string
  academia_id: string
  aluno_id: string
  spotify_track_id: string
  nome_musica: string
  artista: string
  capa_url: string | null
  duracao_ms: number | null
  status: 'na_fila' | 'tocada' | 'removida'
  votos_count: number
  created_at: string
  added_to_spotify_at: string | null
  alunos?: { nome: string }
}

export type Voto = {
  id: string
  fila_item_id: string
  aluno_id: string
  academia_id: string
  created_at: string
}

export type HistoricoTocada = {
  id: string
  academia_id: string
  aluno_id: string | null
  spotify_track_id: string
  nome_musica: string
  artista: string
  capa_url: string | null
  duracao_ms: number | null
  tocada_em: string
  alunos?: { nome: string } | null
}

export type BloqueioLog = {
  id: string
  academia_id: string
  aluno_id: string | null
  spotify_track_id: string
  nome_musica: string
  artista: string
  genero_detectado: string | null
  motivo: 'genero_bloqueado' | 'musica_bloqueada' | 'duplicada' | 'limite_aluno' | 'musica_explicita' | 'duracao_excedida'
  created_at: string
}

export type ConfigAcademia = {
  academia_id: string
  generos_bloqueados: string[]
  musicas_bloqueadas: string[]
  limite_sugestoes_aluno_por_dia: number
  duracao_maxima_ms: number
  bloquear_explicitas: boolean
}
