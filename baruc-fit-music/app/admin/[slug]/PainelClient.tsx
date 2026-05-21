'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import FilaTempoReal from '@/components/FilaTempoReal'
import LogBloqueios from '@/components/LogBloqueios'
import QRCodeAcademia from '@/components/QRCodeAcademia'
import HistoricoAdmin from '@/components/HistoricoAdmin'
import ConfiguracaoPanel from './ConfiguracaoPanel'
import SugestoesAdmin from '@/components/SugestoesAdmin'

type NowPlaying = {
  id: string
  name: string
  artist: string
  albumArt: string | null
  durationMs: number
  progressMs: number
  isPlaying: boolean
} | null

type AcademiaInfo = {
  id: string
  nome: string
  slug: string
  spotifyConectado: boolean
}

type Aba = 'fila' | 'bloqueios' | 'historico' | 'qrcode' | 'spotify' | 'config' | 'sugestoes'

export default function PainelClient({
  academia,
  appUrl,
}: {
  academia: AcademiaInfo
  appUrl: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [aba, setAba] = useState<Aba>('fila')
  const [spotifyConectado, setSpotifyConectado] = useState(academia.spotifyConectado)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null)
  const [toast, setToast] = useState<string | null>(null)
  const lastTrackIdRef = useRef<string | null | undefined>(undefined)

  // Feedback do OAuth Spotify via query param
  useEffect(() => {
    const spotify = searchParams.get('spotify')
    if (spotify === 'conectado') {
      setSpotifyConectado(true)
      showToast('Spotify conectado com sucesso!')
      router.replace(`/admin/${academia.slug}`)
    } else if (spotify === 'erro') {
      showToast('Erro ao conectar Spotify. Tente novamente.')
      router.replace(`/admin/${academia.slug}`)
    }
  }, [searchParams, academia.slug, router])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // Polling "tocando agora" a cada 5s — detecta mudança de faixa para o histórico
  const fetchNowPlaying = useCallback(async () => {
    if (!spotifyConectado) return
    const res = await fetch(`/api/spotify/now-playing?slug=${academia.slug}`)
    const data = await res.json()
    if (!data.connected) return

    const track: NowPlaying = data.nowPlaying ?? null
    setNowPlaying(track)

    // Registra no histórico quando a faixa muda (ignora a primeira detecção)
    if (
      track &&
      lastTrackIdRef.current !== undefined &&
      track.id !== lastTrackIdRef.current
    ) {
      fetch('/api/historico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: academia.slug, track }),
      }).catch(() => {})
    }

    lastTrackIdRef.current = track?.id ?? null
  }, [spotifyConectado, academia.slug])

  useEffect(() => {
    fetchNowPlaying()
    const interval = setInterval(fetchNowPlaying, 5000)
    return () => clearInterval(interval)
  }, [fetchNowPlaying])

  async function desconectarSpotify() {
    await fetch('/api/spotify/disconnect', { method: 'POST' })
    setSpotifyConectado(false)
    setNowPlaying(null)
    showToast('Spotify desconectado.')
  }

  async function sair() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
  }

  function progressPercent(): number {
    if (!nowPlaying || !nowPlaying.durationMs) return 0
    return Math.min(100, (nowPlaying.progressMs / nowPlaying.durationMs) * 100)
  }

  type NavItem = { id: Aba; label: string; icon: React.ReactNode }

  const navItems: NavItem[] = [
    {
      id: 'fila', label: 'Fila',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" /></svg>,
    },
    {
      id: 'bloqueios', label: 'Bloqueios',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
    },
    {
      id: 'historico', label: 'Histórico',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      id: 'qrcode', label: 'QR Code',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>,
    },
    {
      id: 'spotify', label: 'Spotify',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
    },
    {
      id: 'config', label: 'Config',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      id: 'sugestoes', label: 'Sugestões',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.001 3.001 0 00-.765 1.274l-.282 1.13a1 1 0 01-.97.766H9.948a1 1 0 01-.97-.766l-.282-1.13a3 3 0 00-.765-1.274l-.347-.347z" /></svg>,
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-white">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 text-white px-5 py-3 rounded-xl shadow-xl text-sm" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          {toast}
        </div>
      )}

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0" style={{ background: '#111111', borderRight: '0.5px solid #2A2A2A' }}>
        {/* Logo */}
        <div className="p-5 flex items-center gap-3" style={{ borderBottom: '0.5px solid #2A2A2A' }}>
          <Image src="/logo.png" alt="Baruc Fit Music" width={36} height={36} className="object-contain flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-bebas text-gold text-base leading-tight" style={{ letterSpacing: '2px' }}>BARUC FIT</p>
            <p className="text-xs truncate" style={{ color: '#555' }}>{academia.nome}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={aba === item.id
                ? { background: '#F5A800', color: '#0D0D0D' }
                : { color: '#999' }
              }
              onMouseEnter={e => { if (aba !== item.id) (e.currentTarget as HTMLButtonElement).style.background = '#222' }}
              onMouseLeave={e => { if (aba !== item.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sair */}
        <div className="p-3" style={{ borderTop: '0.5px solid #2A2A2A' }}>
          <button
            onClick={sair}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{ color: '#555' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#FF4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,68,68,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#555'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3" style={{ borderBottom: '0.5px solid #2A2A2A', background: '#111' }}>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Baruc Fit Music" width={28} height={28} className="object-contain" />
            <span className="font-bebas text-gold text-base" style={{ letterSpacing: '2px' }}>BARUC FIT</span>
          </div>
          <button onClick={sair} className="text-xs" style={{ color: '#555' }}>Sair</button>
        </header>

        {/* Mobile tab bar */}
        <div className="lg:hidden flex overflow-x-auto px-2 py-2 gap-1" style={{ background: '#111', borderBottom: '0.5px solid #2A2A2A' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={aba === item.id
                ? { background: '#F5A800', color: '#0D0D0D' }
                : { color: '#999', background: '#1A1A1A' }
              }
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Conteúdo principal scrollável */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-8">
          {/* Card "Tocando agora" — sempre visível no topo */}
          <div
            className="rounded-xl p-4 mb-6"
            style={{
              background: '#1A1A1A',
              borderTop: '3px solid #F5A800',
              borderLeft: '0.5px solid #2A2A2A',
              borderRight: '0.5px solid #2A2A2A',
              borderBottom: '0.5px solid #2A2A2A',
            }}
          >
            <p className="font-bebas text-gold text-xs mb-3" style={{ letterSpacing: '2px' }}>♪ TOCANDO AGORA</p>

            {!spotifyConectado ? (
              <div className="flex items-center justify-between">
                <p className="text-muted text-sm">Spotify não conectado</p>
                <a
                  href="/api/spotify/login"
                  className="font-bebas text-sm px-4 py-2 rounded-xl transition-all"
                  style={{ background: '#1DB954', color: '#000', letterSpacing: '1px' }}
                >
                  CONECTAR
                </a>
              </div>
            ) : nowPlaying ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden" style={{ background: '#2A2A2A' }}>
                    {nowPlaying.albumArt && (
                      <img src={nowPlaying.albumArt} alt={nowPlaying.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{nowPlaying.name}</p>
                    <p className="text-muted text-xs truncate">{nowPlaying.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${nowPlaying.isPlaying ? 'bg-green-400 animate-pulse' : 'bg-muted'}`} />
                      <span className="text-xs" style={{ color: '#555' }}>{nowPlaying.isPlaying ? 'Reproduzindo' : 'Pausado'}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: '#2A2A2A' }}>
                  <div
                    className="h-full bg-gold rounded-full transition-all duration-1000"
                    style={{ width: `${progressPercent()}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: '#555' }}>Nenhuma música tocando</p>
            )}
          </div>

          {/* Conteúdo da aba ativa */}
          <div className="max-w-2xl">
            {aba === 'fila' && <FilaTempoReal academiaId={academia.id} academiaSlug={academia.slug} />}
            {aba === 'bloqueios' && <LogBloqueios academiaId={academia.id} />}
            {aba === 'historico' && <HistoricoAdmin academiaSlug={academia.slug} />}
            {aba === 'qrcode' && (
              <div className="rounded-xl p-6" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
                <QRCodeAcademia slug={academia.slug} appUrl={appUrl} nomeAcademia={academia.nome} />
              </div>
            )}
            {aba === 'spotify' && (
              <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
                <p className="font-bebas text-gold text-sm tracking-widest">CONEXÃO SPOTIFY</p>
                {spotifyConectado ? (
                  <>
                    <p className="text-white text-sm">Spotify conectado a <span className="text-gold">{academia.nome}</span>.</p>
                    <button
                      onClick={desconectarSpotify}
                      className="font-bebas px-5 py-2.5 rounded-xl text-sm w-fit transition-all"
                      style={{ background: '#2A2A2A', color: '#FF4444', letterSpacing: '1px', border: '0.5px solid rgba(255,68,68,0.3)' }}
                    >
                      DESCONECTAR SPOTIFY
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-muted text-sm">Conecte sua conta Spotify Premium para ativar a fila.</p>
                    <a
                      href="/api/spotify/login"
                      className="font-bebas px-5 py-2.5 rounded-xl text-sm w-fit transition-all"
                      style={{ background: '#1DB954', color: '#000', letterSpacing: '1px' }}
                    >
                      CONECTAR SPOTIFY
                    </a>
                  </>
                )}
              </div>
            )}
            {aba === 'config' && <ConfiguracaoPanel academiaSlug={academia.slug} />}
            {aba === 'sugestoes' && <SugestoesAdmin academiaSlug={academia.slug} />}
          </div>
        </main>
      </div>
    </div>
  )
}
