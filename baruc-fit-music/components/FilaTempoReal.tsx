'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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

export default function FilaTempoReal({ academiaId, academiaSlug }: Props) {
  const [fila, setFila] = useState<FilaSugestao[]>([])
  const [removendo, setRemovendo] = useState<string | null>(null)

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
      {fila.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
        >
          <span className="font-bebas text-muted text-base w-5 text-center flex-shrink-0">{index + 1}</span>

          <div className="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: '#2A2A2A' }}>
            {item.capa_url ? (
              <Image src={item.capa_url} alt={item.nome_musica} fill sizes="44px" className="object-cover" />
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

          <button
            onClick={() => remover(item.id)}
            disabled={removendo === item.id}
            className="flex-shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-40"
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
      ))}
    </div>
  )
}
