import { supabaseAdmin } from './supabase'

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API = 'https://api.spotify.com/v1'

export type SpotifyTrack = {
  id: string
  name: string
  artists: { id: string; name: string }[]
  album: { id: string; images: { url: string }[] }
  duration_ms: number
  explicit: boolean
}

export type SpotifyArtist = {
  id: string
  name: string
  images: { url: string }[]
}

export type SpotifyAlbum = {
  id: string
  name: string
  artists: { id: string; name: string }[]
  images: { url: string }[]
}

// ----------------------------------------------------------------
// Obter token válido da academia (com refresh automático)
// ----------------------------------------------------------------
export async function getAcademiaToken(academiaId: string): Promise<string> {
  const db = supabaseAdmin()
  const { data: academia } = await db
    .from('academias')
    .select('spotify_access_token, spotify_refresh_token, spotify_token_expires_at')
    .eq('id', academiaId)
    .single()

  if (!academia?.spotify_refresh_token) throw new Error('Academia não conectada ao Spotify')

  const expiresAt = academia.spotify_token_expires_at
    ? new Date(academia.spotify_token_expires_at).getTime()
    : 0

  // Refresh se expira em menos de 60s
  if (Date.now() >= expiresAt - 60_000) {
    return refreshToken(academiaId, academia.spotify_refresh_token)
  }

  return academia.spotify_access_token!
}

async function refreshToken(academiaId: string, refreshToken: string): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) throw new Error('Falha ao renovar token Spotify')

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

  const db = supabaseAdmin()
  await db
    .from('academias')
    .update({
      spotify_access_token: data.access_token,
      spotify_token_expires_at: expiresAt,
      ...(data.refresh_token ? { spotify_refresh_token: data.refresh_token } : {}),
    })
    .eq('id', academiaId)

  return data.access_token
}

// ----------------------------------------------------------------
// Buscar músicas
// ----------------------------------------------------------------
export async function searchTracks(query: string, token: string): Promise<SpotifyTrack[]> {
  const params = new URLSearchParams({ q: query, type: 'track', limit: '10', market: 'BR' })
  const res = await fetch(`${SPOTIFY_API}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.tracks?.items ?? []
}

// ----------------------------------------------------------------
// Buscar artistas
// ----------------------------------------------------------------
export async function searchArtists(query: string, token: string): Promise<SpotifyArtist[]> {
  const params = new URLSearchParams({ q: query, type: 'artist', limit: '8', market: 'BR' })
  const res = await fetch(`${SPOTIFY_API}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.artists?.items ?? []
}

// ----------------------------------------------------------------
// Buscar álbuns
// ----------------------------------------------------------------
export async function searchAlbums(query: string, token: string): Promise<SpotifyAlbum[]> {
  const params = new URLSearchParams({ q: query, type: 'album', limit: '8', market: 'BR' })
  const res = await fetch(`${SPOTIFY_API}/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.albums?.items ?? []
}

// ----------------------------------------------------------------
// Buscar gêneros do artista
// ----------------------------------------------------------------
export async function getArtistGenres(artistId: string, token: string): Promise<string[]> {
  const res = await fetch(`${SPOTIFY_API}/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    console.log('[GENERO] ERRO ao buscar gêneros:', `status=${res.status} artistId=${artistId}`)
    return []
  }
  const data = await res.json()
  return data.genres ?? []
}

// ----------------------------------------------------------------
// Adicionar à fila
// ----------------------------------------------------------------
export async function addToQueue(trackUri: string, token: string): Promise<{ ok: boolean; status: number; erro?: string }> {
  const res = await fetch(
    `${SPOTIFY_API}/me/player/queue?uri=${encodeURIComponent(trackUri)}`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
  )
  if (res.ok || res.status === 204) return { ok: true, status: res.status }
  let erro = ''
  try { const body = await res.json(); erro = body?.error?.message ?? JSON.stringify(body) } catch {}
  console.error(`[Spotify queue] status=${res.status} erro=${erro}`)
  return { ok: false, status: res.status, erro }
}

// ----------------------------------------------------------------
// Música tocando agora
// ----------------------------------------------------------------
export async function getNowPlaying(token: string) {
  const res = await fetch(`${SPOTIFY_API}/me/player/currently-playing?market=BR`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok || res.status === 204) return null
  const data = await res.json()
  if (!data?.item) return null
  return {
    id: data.item.id,
    name: data.item.name,
    artist: data.item.artists.map((a: { name: string }) => a.name).join(', '),
    albumArt: data.item.album.images[0]?.url ?? null,
    durationMs: data.item.duration_ms,
    progressMs: data.progress_ms,
    isPlaying: data.is_playing,
  }
}

// ----------------------------------------------------------------
// Trocar code por tokens (callback OAuth)
// ----------------------------------------------------------------
export async function exchangeCode(code: string) {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    }),
  })

  if (!res.ok) throw new Error('Falha ao trocar code por token')
  return res.json()
}
