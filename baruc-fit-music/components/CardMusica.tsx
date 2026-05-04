'use client'

import Image from 'next/image'

export type TrackResult = {
  id: string
  name: string
  artist: string
  artistId: string
  albumArt: string | null
  durationMs: number
  explicit: boolean
}

function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

type Props = {
  track: TrackResult
  onSelect: (track: TrackResult) => void
  disabled?: boolean
}

type ExtendedProps = Props & { isLoading?: boolean }

export default function CardMusica({ track, onSelect, disabled, isLoading }: ExtendedProps) {
  const isActive = isLoading

  return (
    <button
      onClick={() => onSelect(track)}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all disabled:cursor-not-allowed group"
      style={{
        background: isActive ? '#F5A800' : '#1A1A1A',
        borderLeft: isActive ? '3px solid #C47F00' : '3px solid transparent',
        opacity: disabled && !isActive ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.cssText += 'background:#222;border-left:3px solid #F5A800;' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.cssText = `background:#1A1A1A;border-left:3px solid transparent;opacity:${disabled ? '0.5' : '1'};` }}
    >
      <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: '#2A2A2A' }}>
        {track.albumArt ? (
          <Image src={track.albumArt} alt={track.name} fill sizes="40px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xl" style={{ color: '#444' }}>♪</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate text-sm ${isActive ? 'text-bg' : 'text-white'}`}>{track.name}</p>
        <p className={`truncate text-xs mt-0.5 ${isActive ? 'text-bg/70' : 'text-muted'}`}>{track.artist}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs ${isActive ? 'text-bg/60' : 'text-muted'}`}>{formatDuration(track.durationMs)}</span>
          {track.explicit && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isActive ? 'bg-bg/20 text-bg' : 'bg-border text-muted'}`}>E</span>
          )}
        </div>
      </div>

      {isActive ? (
        <svg className="w-5 h-5 flex-shrink-0 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0 text-gold opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}
