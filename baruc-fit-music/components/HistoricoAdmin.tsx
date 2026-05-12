'use client'

import { useEffect, useState, useCallback } from 'react'
import { HistoricoTocada } from '@/lib/supabase'

type Periodo = 'hoje' | '7dias' | '30dias'

type TopMusica = {
  spotify_track_id: string
  nome_musica: string
  artista: string
  capa_url: string | null
  count: number
}

type ApiResponse = {
  historico: HistoricoTocada[]
  topMusicas: TopMusica[]
  total: number
  page: number
  totalPages: number
}

function formatDatetime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoricoAdmin({ academiaSlug }: { academiaSlug: string }) {
  const [periodo, setPeriodo] = useState<Periodo>('30dias')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async (p: Periodo, pg: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/historico?slug=${academiaSlug}&periodo=${p}&page=${pg}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [academiaSlug])

  useEffect(() => {
    setPage(1)
    carregar(periodo, 1)
  }, [periodo, carregar])

  function changePeriodo(p: Periodo) {
    setPeriodo(p)
  }

  function changePage(pg: number) {
    setPage(pg)
    carregar(periodo, pg)
  }

  const periodos: { id: Periodo; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: '7dias', label: '7 dias' },
    { id: '30dias', label: '30 dias' },
  ]

  return (
    <div className="space-y-4">
      {/* Filtro de período */}
      <div className="flex gap-2">
        {periodos.map(p => (
          <button
            key={p.id}
            onClick={() => changePeriodo(p.id)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
            style={periodo === p.id
              ? { background: '#F5A800', color: '#0D0D0D' }
              : { background: '#1A1A1A', color: '#999', border: '0.5px solid #2A2A2A' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || data.total === 0 ? (
        <div className="text-center py-12">
          <p className="font-bebas text-muted text-2xl tracking-widest">SEM DADOS</p>
          <p className="text-muted text-sm mt-1">Nenhuma música registrada neste período.</p>
        </div>
      ) : (
        <>
          {/* Top músicas */}
          {data.topMusicas.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bebas text-gold text-sm tracking-widest">MAIS TOCADAS</p>
                <button
                  className="font-bebas text-xs px-3 py-1 rounded-full"
                  style={{ background: '#2A2A2A', color: '#999', letterSpacing: '1px' }}
                  title="Em breve"
                >
                  ▶ GERAR PLAYLIST
                </button>
              </div>
              <p className="text-xs mb-3" style={{ color: '#555' }}>
                Base para futura playlist personalizada
              </p>
              <div className="space-y-2.5">
                {data.topMusicas.slice(0, 10).map((item, i) => (
                  <div key={item.spotify_track_id} className="flex items-center gap-3">
                    <span className="font-bebas text-muted text-base w-4 text-center flex-shrink-0">{i + 1}</span>
                    <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden" style={{ background: '#2A2A2A' }}>
                      {item.capa_url && <img src={item.capa_url} alt={item.nome_musica} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs truncate font-medium">{item.nome_musica}</p>
                      <p className="text-muted text-xs truncate">{item.artista}</p>
                    </div>
                    <span className="font-bebas text-gold text-sm flex-shrink-0">{item.count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Log detalhado */}
          <div className="rounded-xl p-4" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
            <p className="font-bebas text-gold text-sm tracking-widest mb-3">
              LOG DETALHADO — {data.total} REGISTRO{data.total !== 1 ? 'S' : ''}
            </p>
            <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
              {data.historico.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2.5"
                  style={{ borderBottom: '0.5px solid #2A2A2A' }}
                >
                  <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden" style={{ background: '#2A2A2A' }}>
                    {item.capa_url && <img src={item.capa_url} alt={item.nome_musica} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate font-medium">{item.nome_musica}</p>
                    <p className="text-muted text-xs truncate">{item.artista}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#555' }}>
                      {item.alunos?.nome
                        ? <>Pedido por <span className="text-muted">{item.alunos.nome}</span> · </>
                        : 'Sem pedido · '
                      }
                      {formatDatetime(item.tocada_em)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => changePage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-lg text-sm transition-all disabled:opacity-30"
                  style={{ background: '#2A2A2A', color: '#999' }}
                >
                  ‹
                </button>
                <span className="text-muted text-xs">{page} / {data.totalPages}</span>
                <button
                  onClick={() => changePage(page + 1)}
                  disabled={page === data.totalPages}
                  className="px-3 py-1 rounded-lg text-sm transition-all disabled:opacity-30"
                  style={{ background: '#2A2A2A', color: '#999' }}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
