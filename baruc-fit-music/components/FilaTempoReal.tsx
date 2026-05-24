'use client'

import { useEffect, useState } from 'react'
import { supabase, FilaSugestao } from '@/lib/supabase'

type Props = {
  academiaId: string
  academiaSlug: string
}

function formatDuration(ms: number | null): string {
  if (!ms) return ''
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// Extrai o nome do primeiro artista de uma string como "Gusttavo Lima, Maria Gadú"
function primeiroArtista(artista: string): string {
  return artista.split(',')[0].trim()
}

export default function FilaTempoReal({ academiaId, academiaSlug }: Props) {
  const [fila, setFila] = useState<FilaSugestao[]>([])
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState<string | null>(null)
  const [bloqueando, setBloqueando] = useState<string | null>(null)
  const [artistaBloqueado, setArtistaBloqueado] = useState<string | null>(null)

  useEffect(() => {
    const carregar = () =>
      supabase
        .from('fila_sugestoes')
        .select('*, alunos(nome)')
        .eq('academia_id', academiaId)
        .eq('status', 'na_fila')
        .order('created_at', { ascending: true })
        .then(({ data }) => setFila((data as FilaSugestao[]) ?? []))

    carregar()

    const channel = supabase
      .channel(`fila-admin-${academiaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_sugestoes', filter: `academia_id=eq.${academiaId}` }, () => carregar())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [academiaId])

  async function remover(itemId: string) {
    setRemovendo(itemId)
    try {
      await fetch(`/api/admin/fila?itemId=${itemId}`, { method: 'DELETE' })
    } finally {
      setRemovendo(null)
    }
  }

  async function bloquearArtista(itemId: string, artistaNome: string) {
    setBloqueando(itemId)
    setConfirmandoBloqueio(null)
    try {
      const res = await fetch('/api/admin/config/bloquear-artista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistaNome: primeiroArtista(artistaNome) }),
      })
      const data = await res.json()
      if (res.ok) {
        setArtistaBloqueado(data.artista?.nome ?? artistaNome)
        setTimeout(() => setArtistaBloqueado(null), 3000)
      }
    } finally {
      setBloqueando(null)
    }
  }

  if (fila.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-bebas text-muted text-2xl tracking-widest mb-1">FILA VAZIA</p>
        <p className="text-muted text-sm">Aguardando sugestões dos alunos.</p>
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

      {fila.map((item, index) => (
        <div key={item.id} className="flex flex-col rounded-xl overflow-hidden" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          <div className="flex items-center gap-3 p-3">
            <span className="font-bebas text-muted text-base w-5 text-center flex-shrink-0">{index + 1}</span>

            <div className="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: '#2A2A2A' }}>
              {item.capa_url ? (
                <img src={item.capa_url} alt={item.nome_musica} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted">♪</div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{item.nome_musica}</p>
              <p className="text-muted text-xs truncate">{item.artista}</p>
              <p className="text-xs mt-0.5" style={{ color: '#555' }}>
                {(item.alunos as { nome: string } | undefined)?.nome ?? '—'}
                {item.duracao_ms && <span className="ml-2">{formatDuration(item.duracao_ms)}</span>}
              </p>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Bloquear artista */}
              <button
                onClick={() => setConfirmandoBloqueio(confirmandoBloqueio === item.id ? null : item.id)}
                disabled={bloqueando === item.id}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{ color: '#555' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#F5A800')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                title={`Bloquear artista: ${primeiroArtista(item.artista)}`}
              >
                {bloqueando === item.id ? (
                  <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                )}
              </button>

              {/* Remover da fila */}
              <button
                onClick={() => remover(item.id)}
                disabled={removendo === item.id}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={{ color: '#555' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#FF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                title="Remover da fila"
              >
                {removendo === item.id ? (
                  <div className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirmação de bloqueio inline */}
          {confirmandoBloqueio === item.id && (
            <div className="flex items-center justify-between px-4 py-2.5 gap-3" style={{ background: '#111', borderTop: '0.5px solid #2A2A2A' }}>
              <p className="text-xs text-white">
                Bloquear <strong style={{ color: '#F5A800' }}>{primeiroArtista(item.artista)}</strong>?
                <span className="ml-1" style={{ color: '#555' }}>Futuras sugestões serão rejeitadas.</span>
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setConfirmandoBloqueio(null)}
                  className="text-xs px-3 py-1 rounded-lg transition-colors"
                  style={{ background: '#2A2A2A', color: '#999' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => bloquearArtista(item.id, item.artista)}
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
