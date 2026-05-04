'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type NowPlaying = {
  id: string
  name: string
  artist: string
  albumArt: string | null
  durationMs: number
  progressMs: number
  isPlaying: boolean
}

export default function MusicaAtual({ slug }: { slug: string }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let active = true

    async function carregar() {
      try {
        const res = await fetch(`/api/spotify/now-playing?slug=${slug}`)
        if (!res.ok || !active) return
        const data = await res.json()
        if (!active) return
        const track = data.connected ? (data.nowPlaying ?? null) : null
        setNowPlaying(track)
        if (track) setProgress((track.progressMs / track.durationMs) * 100)
      } catch {}
    }

    carregar()
    const interval = setInterval(carregar, 12000)
    return () => { active = false; clearInterval(interval) }
  }, [slug])

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: '#1A1A1A',
        borderLeft: '3px solid #F5A800',
        borderTop: '0.5px solid #2A2A2A',
        borderRight: '0.5px solid #2A2A2A',
        borderBottom: '0.5px solid #2A2A2A',
        borderRadius: '10px',
      }}
    >
      <p className="font-bebas text-gold text-xs mb-3" style={{ letterSpacing: '2px' }}>
        ♪ TOCANDO AGORA
      </p>

      {nowPlaying ? (
        <>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: '#2A2A2A' }}>
              {nowPlaying.albumArt && (
                <Image src={nowPlaying.albumArt} alt={nowPlaying.name} fill sizes="40px" className="object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-xs truncate">{nowPlaying.name}</p>
              <p className="text-muted truncate" style={{ fontSize: '9px' }}>{nowPlaying.artist}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${nowPlaying.isPlaying ? 'bg-green-400 animate-pulse' : 'bg-muted'}`} />
                <span className="text-xs" style={{ color: '#555' }}>{nowPlaying.isPlaying ? 'Reproduzindo' : 'Pausado'}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 h-0.5 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
            <div
              className="h-full bg-gold rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-sm" style={{ color: '#555' }}>Nenhuma música tocando no momento</p>
      )}
    </div>
  )
}
