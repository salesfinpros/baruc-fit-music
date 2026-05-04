'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import CardMusica, { TrackResult } from './CardMusica'

type Props = {
  academiaSlug: string
  onSelect: (track: TrackResult) => void
  disabled?: boolean
}

export default function BuscaMusica({ academiaSlug, onSelect, disabled }: Props) {
  const [query, setQuery] = useState('')
  const [tracks, setTracks] = useState<TrackResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscar = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setTracks([])
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/spotify/search?q=${encodeURIComponent(q)}&slug=${academiaSlug}`
        )
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setTracks(data.tracks ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro na busca')
        setTracks([])
      } finally {
        setLoading(false)
      }
    },
    [academiaSlug]
  )

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(query), 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, buscar])

  const [selectedId, setSelectedId] = useState<string | null>(null)

  function handleSelect(track: TrackResult) {
    setSelectedId(track.id)
    onSelect(track)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        {/* Ícone de lupa */}
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Nome da música ou artista..."
          disabled={disabled}
          className="w-full bg-surface border rounded-xl pl-10 pr-10 py-3.5 text-white placeholder-muted disabled:opacity-50"
          style={{ borderColor: '#2A2A2A' }}
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {error && <p className="text-danger text-sm text-center">{error}</p>}

      {tracks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tracks.map(track => (
            <CardMusica
              key={track.id}
              track={track}
              onSelect={handleSelect}
              disabled={disabled}
              isLoading={selectedId === track.id && disabled}
            />
          ))}
        </div>
      )}

      {!loading && query.trim() && tracks.length === 0 && !error && (
        <p className="text-muted text-sm text-center py-4">
          Nenhuma música encontrada para &quot;{query}&quot;
        </p>
      )}
    </div>
  )
}
