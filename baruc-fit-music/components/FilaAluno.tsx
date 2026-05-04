'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { supabase, FilaSugestao } from '@/lib/supabase'

type Props = {
  academiaId: string
  alunoId: string | null
}

function formatDuration(ms: number | null): string {
  if (!ms) return ''
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function FilaAluno({ academiaId, alunoId }: Props) {
  const [fila, setFila] = useState<FilaSugestao[]>([])
  const [meusVotos, setMeusVotos] = useState<Set<string>>(new Set())
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [votando, setVotando] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const [filaRes, votosRes] = await Promise.all([
      supabase
        .from('fila_sugestoes')
        .select('*, alunos(nome)')
        .eq('academia_id', academiaId)
        .eq('status', 'na_fila')
        .order('votos_count', { ascending: false })
        .order('created_at', { ascending: true }),
      alunoId
        ? supabase
            .from('votos')
            .select('fila_item_id')
            .eq('academia_id', academiaId)
            .eq('aluno_id', alunoId)
        : Promise.resolve({ data: [] }),
    ])

    setFila((filaRes.data as FilaSugestao[]) ?? [])
    setMeusVotos(
      new Set(((votosRes.data ?? []) as { fila_item_id: string }[]).map(v => v.fila_item_id))
    )
  }, [academiaId, alunoId])

  useEffect(() => {
    carregar()

    const channel = supabase
      .channel(`fila-aluno-${academiaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fila_sugestoes', filter: `academia_id=eq.${academiaId}` }, () => carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votos', filter: `academia_id=eq.${academiaId}` }, () => carregar())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [academiaId, carregar])

  async function cancelar(itemId: string) {
    if (!alunoId) return
    setRemovendo(itemId)
    try {
      await fetch(`/api/alunos/sugestao?itemId=${itemId}&alunoId=${alunoId}`, { method: 'DELETE' })
    } finally {
      setRemovendo(null)
    }
  }

  async function votar(itemId: string) {
    if (!alunoId || votando) return
    setVotando(itemId)
    const jáVotei = meusVotos.has(itemId)
    try {
      if (jáVotei) {
        await fetch(`/api/votar?filaItemId=${itemId}&alunoId=${alunoId}`, { method: 'DELETE' })
      } else {
        await fetch('/api/votar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filaItemId: itemId, alunoId }),
        })
      }
    } finally {
      setVotando(null)
    }
  }

  if (fila.length === 0) return null

  return (
    <div className="mt-2">
      <div className="gold-divider mb-3">
        <span className="font-bebas text-xs flex-shrink-0" style={{ color: '#666', letterSpacing: '3px' }}>
          NA FILA — VOTE PARA SUBIR
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {fila.map((item) => {
          const isMinha = item.aluno_id === alunoId
          const votei = meusVotos.has(item.id)
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: isMinha ? 'rgba(245,168,0,0.08)' : '#1A1A1A',
                border: isMinha ? '0.5px solid rgba(245,168,0,0.3)' : '0.5px solid #2A2A2A',
              }}
            >
              <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: '#2A2A2A' }}>
                {item.capa_url ? (
                  <Image src={item.capa_url} alt={item.nome_musica} fill sizes="40px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-xs">♪</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{item.nome_musica}</p>
                <p className="text-muted truncate" style={{ fontSize: '9px' }}>{item.artista}</p>
                <p className="text-xs mt-0.5">
                  {isMinha ? (
                    <span className="text-gold" style={{ opacity: 0.8 }}>Você pediu</span>
                  ) : (
                    <span style={{ color: '#555' }}>{(item.alunos as { nome: string } | undefined)?.nome ?? '—'}</span>
                  )}
                  {item.duracao_ms ? <span className="ml-2" style={{ color: '#444' }}>{formatDuration(item.duracao_ms)}</span> : null}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!isMinha ? (
                  <button
                    onClick={() => votar(item.id)}
                    disabled={votando === item.id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all disabled:opacity-40"
                    style={votei
                      ? { background: '#F5A800', color: '#0D0D0D', border: 'none' }
                      : { background: '#222', color: '#999', border: '1px solid #333' }
                    }
                  >
                    {votando === item.id ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>▲</span>
                    )}
                    <span>{item.votos_count}</span>
                  </button>
                ) : (
                  <>
                    {item.votos_count > 0 && (
                      <span className="text-xs font-bold text-gold">{item.votos_count}↑</span>
                    )}
                    <button
                      onClick={() => cancelar(item.id)}
                      disabled={removendo === item.id}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
                      style={{ color: '#555' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#FF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                    >
                      {removendo === item.id ? (
                        <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
