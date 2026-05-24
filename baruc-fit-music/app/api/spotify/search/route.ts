import { NextRequest, NextResponse } from 'next/server'
import { searchTracks, searchArtists, searchAlbums, getAcademiaToken } from '@/lib/spotify'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  const slug = searchParams.get('slug')
  const type = searchParams.get('type') ?? 'track'

  if (!query || !slug) {
    return NextResponse.json({ tracks: [], artists: [], albums: [] })
  }

  try {
    const db = supabaseAdmin()
    const { data: academia } = await db
      .from('academias')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!academia) return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })

    const token = await getAcademiaToken(academia.id)

    if (type === 'artist') {
      const artists = await searchArtists(query, token)
      return NextResponse.json({
        artists: artists.map(a => ({
          id: a.id,
          nome: a.name,
          imagemUrl: a.images[1]?.url ?? a.images[0]?.url ?? null,
        })),
      })
    }

    if (type === 'album') {
      const albums = await searchAlbums(query, token)
      return NextResponse.json({
        albums: albums.map(a => ({
          id: a.id,
          nome: a.name,
          artista: a.artists.map(ar => ar.name).join(', '),
          imagemUrl: a.images[1]?.url ?? a.images[0]?.url ?? null,
        })),
      })
    }

    // type === 'track' (padrão)
    const tracks = await searchTracks(query, token)
    return NextResponse.json({
      tracks: tracks.map(t => ({
        id: t.id,
        name: t.name,
        artist: t.artists.map(a => a.name).join(', '),
        artistId: t.artists[0]?.id,
        albumId: t.album.id,
        albumArt: t.album.images[1]?.url ?? t.album.images[0]?.url ?? null,
        durationMs: t.duration_ms,
        explicit: t.explicit,
      })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
