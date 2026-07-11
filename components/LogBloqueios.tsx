'use client'

import { useEffect, useState } from 'react'
import { supabase, BloqueioLog } from '@/lib/supabase'

const motivoLabel: Record<string, string> = {
  genero_bloqueado: 'Gênero bloqueado',
  musica_bloqueada: 'Música na blacklist',
  artista_bloqueado: 'Artista bloqueado',
  album_bloqueado: 'Álbum bloqueado',
  duplicada: 'Já na fila',
  ja_na_fila: 'Já na fila',
  limite_aluno: 'Limite diário',
  musica_explicita: 'Conteúdo explícito',
  duracao_excedida: 'Duração excedida',
}

const motivoColor: Record<string, string> = {
  genero_bloqueado: 'text-orange-400 bg-orange-400/10',
  musica_bloqueada: 'text-red-400 bg-red-400/10',
  artista_bloqueado: 'text-red-400 bg-red-400/10',
  album_bloqueado: 'text-red-400 bg-red-400/10',
  duplicada: 'text-blue-400 bg-blue-400/10',
  ja_na_fila: 'text-blue-400 bg-blue-400/10',
  limite_aluno: 'text-purple-400 bg-purple-400/10',
  musica_explicita: 'text-pink-400 bg-pink-400/10',
  duracao_excedida: 'text-yellow-400 bg-yellow-400/10',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function primeiroArtista(artista: string): string {
  return artista.split(',')[0].trim()
}

type Props = { academiaId: string; redeId: string | null }

export default function LogBloqueios({ academiaId, redeId }: Props) {
  const [logs, setLogs] = useState<BloqueioLog[]>([])
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState<string | null>(null)
  const [bloqueando, setBloqueando] = useState<string | null>(null)
  const [artistaBloqueado, setArtistaBloqueado] = useState<string | null>(null)
  const [aplicarRede, setAplicarRede] = useState(false)

  useEffect(() => {
    supabase
      .from('bloqueios_log')
      .select('*')
      .eq('academia_id', academiaId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setLogs((data as BloqueioLog[]) ?? []))

    const channel = supabase
      .channel(`bloqueios-${academiaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bloqueios_log', filter: `academia_id=eq.${academiaId}` },
        payload => setLogs(prev => [payload.new as BloqueioLog, ...prev.slice(0, 49)])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [academiaId])

  async function bloquearArtista(logId: string, artistaNome: string) {
    setBloqueando(logId)
    setConfirmandoBloqueio(null)
    try {
      const res = await fetch('/api/admin/config/bloquear-artista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistaNome: primeiroArtista(artistaNome), aplicarRede }),
      })
      const data = await res.json()
      if (res.ok) {
        const nome = data.artista?.nome ?? artistaNome
        const sufixo = data.propagadas > 0 ? ` (aplicado em ${data.propagadas} outra${data.propagadas > 1 ? 's' : ''} unidade${data.propagadas > 1 ? 's' : ''})` : ''
        setArtistaBloqueado(nome + sufixo)
        setTimeout(() => setArtistaBloqueado(null), 4000)
      }
    } finally {
      setBloqueando(null)
      setAplicarRede(false)
    }
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-bebas text-muted text-2xl tracking-widest">SEM REJEIÇÕES</p>
        <p className="text-muted text-sm mt-1">Nenhuma música foi bloqueada ainda.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {artistaBloqueado && (
        <div className="text-sm px-4 py-3 rounded-xl" style={{ background: 'rgba(245,168,0,0.1)', border: '0.5px solid rgba(245,168,0,0.3)', color: '#F5A800' }}>
          Artista <strong>{artistaBloqueado}</strong> bloqueado. Próximas sugestões serão rejeitadas.
        </div>
      )}

      {logs.map(log => (
        <div key={log.id} className="flex flex-col rounded-xl overflow-hidden" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          <div className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate font-medium">{log.nome_musica}</p>
              <p className="text-muted text-xs truncate">{log.artista}</p>
              {log.genero_detectado && (
                <p className="text-xs mt-0.5" style={{ color: '#555' }}>Gênero: {log.genero_detectado}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${motivoColor[log.motivo] ?? 'text-muted'}`}>
                  {motivoLabel[log.motivo] ?? log.motivo}
                </span>
                <span className="text-xs" style={{ color: '#555' }}>{formatTime(log.created_at)}</span>
              </div>

              {/* Bloqueio rápido — só para motivos que ainda não bloquearam o artista */}
              {log.motivo !== 'artista_bloqueado' && (
                <button
                  onClick={() => setConfirmandoBloqueio(confirmandoBloqueio === log.id ? null : log.id)}
                  disabled={bloqueando === log.id}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-40 flex-shrink-0"
                  style={{ color: '#555' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#F5A800')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                  title={`Bloquear artista: ${primeiroArtista(log.artista)}`}
                >
                  {bloqueando === log.id ? (
                    <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Confirmação inline */}
          {confirmandoBloqueio === log.id && (
            <div className="flex flex-col gap-2 px-4 py-2.5" style={{ background: '#111', borderTop: '0.5px solid #2A2A2A' }}>
              <p className="text-xs text-white">
                Bloquear <strong style={{ color: '#F5A800' }}>{primeiroArtista(log.artista)}</strong>?
                <span className="ml-1" style={{ color: '#555' }}>Futuras sugestões serão rejeitadas.</span>
              </p>
              {redeId && (
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={aplicarRede}
                    onChange={e => setAplicarRede(e.target.checked)}
                    className="w-3.5 h-3.5 accent-yellow-400"
                  />
                  <span className="text-xs" style={{ color: '#999' }}>Aplicar em toda a rede</span>
                </label>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmandoBloqueio(null); setAplicarRede(false) }}
                  className="text-xs px-3 py-1 rounded-lg transition-colors"
                  style={{ background: '#2A2A2A', color: '#999' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => bloquearArtista(log.id, log.artista)}
                  className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
                  style={{ background: '#F5A800', color: '#0D0D0D' }}
                >
                  Bloquear
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
