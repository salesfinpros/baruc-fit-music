'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import CadastroAluno from '@/components/CadastroAluno'
import BuscaMusica from '@/components/BuscaMusica'
import FilaAluno from '@/components/FilaAluno'
import MusicaAtual from '@/components/MusicaAtual'
import { TrackResult } from '@/components/CardMusica'
import { supabase } from '@/lib/supabase'

type Estado = 'cadastro' | 'busca' | 'enviando' | 'sucesso' | 'boosted' | 'erro'

const STORAGE_KEY = (slug: string) => `baruc_aluno_${slug}`

export default function PaginaSugestao() {
  const { slug } = useParams<{ slug: string }>()
  const [estado, setEstado] = useState<Estado>('cadastro')
  const [alunoId, setAlunoId] = useState<string | null>(null)
  const [alunoNome, setAlunoNome] = useState<string>('')
  const [academiaId, setAcademiaId] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [trackEnviada, setTrackEnviada] = useState<TrackResult | null>(null)

  // Buscar academiaId pelo slug (necessário para exibir a fila)
  useEffect(() => {
    supabase
      .from('academias')
      .select('id')
      .eq('slug', slug)
      .single()
      .then(({ data }) => { if (data) setAcademiaId(data.id) })
  }, [slug])

  // Verificar se aluno já está no localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY(slug))
    if (saved) {
      try {
        const { id, nome } = JSON.parse(saved)
        if (id && nome) {
          setAlunoId(id)
          setAlunoNome(nome)
          setEstado('busca')
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY(slug))
      }
    }
  }, [slug])

  const handleCadastro = useCallback((id: string, nome: string) => {
    setAlunoId(id)
    setAlunoNome(nome)
    localStorage.setItem(STORAGE_KEY(slug), JSON.stringify({ id, nome }))
    setEstado('busca')
  }, [slug])

  const handleSelecionarMusica = useCallback(async (track: TrackResult) => {
    if (!alunoId) return
    setEstado('enviando')
    setErroEnvio(null)

    try {
      const res = await fetch('/api/sugerir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackId: track.id,
          trackName: track.name,
          artistName: track.artist,
          artistId: track.artistId,
          albumArt: track.albumArt,
          durationMs: track.durationMs,
          explicit: track.explicit,
          academiaSlug: slug,
          alunoId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErroEnvio(data.error ?? 'Não foi possível adicionar a música.')
        setEstado('erro')
        return
      }

      setTrackEnviada(track)
      setEstado(data.boosted ? 'boosted' : 'sucesso')
    } catch {
      setErroEnvio('Erro de conexão. Tente novamente.')
      setEstado('erro')
    }
  }, [alunoId, slug])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="px-4 pt-8 pb-5 flex flex-col items-center bg-bg">
        {/* BARUC FIT + ondas */}
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-1" style={{ height: '22px' }}>
            {[1,2,3,4,5].map(i => <div key={i} className="soundwave-bar" />)}
          </div>
          <h1 className="font-bebas text-gold" style={{ fontSize: '26px', letterSpacing: '3px' }}>
            BARUC FIT
          </h1>
          <div className="flex items-end gap-1" style={{ height: '22px' }}>
            {[1,2,3,4,5].map(i => <div key={i} className="soundwave-bar" />)}
          </div>
        </div>
        {/* — MUSIC — */}
        <div className="flex items-center gap-2 mt-1">
          <div className="h-px w-6" style={{ background: 'rgba(245,168,0,0.5)' }} />
          <span className="font-bebas text-gold" style={{ fontSize: '11px', letterSpacing: '4px' }}>— MUSIC —</span>
          <div className="h-px w-6" style={{ background: 'rgba(245,168,0,0.5)' }} />
        </div>
        {alunoNome && (
          <p className="text-muted text-xs mt-2">
            Olá, <span className="text-white">{alunoNome}</span>
          </p>
        )}
      </header>

      <main className="flex-1 px-4 pb-10 max-w-md mx-auto w-full">

        {/* Cadastro */}
        {estado === 'cadastro' && (
          <div
            className="mt-2 rounded-xl p-5"
            style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <CadastroAluno academiaSlug={slug} onCadastro={handleCadastro} />
          </div>
        )}

        {/* Busca */}
        {estado === 'busca' && (
          <div className="mt-2 flex flex-col gap-4">
            <MusicaAtual slug={slug} />

            <div className="gold-divider">
              <span className="font-bebas text-gold text-sm flex-shrink-0" style={{ letterSpacing: '2px' }}>
                SUGIRA UMA MÚSICA
              </span>
            </div>

            <BuscaMusica
              academiaSlug={slug}
              onSelect={handleSelecionarMusica}
            />
            {academiaId && <FilaAluno academiaId={academiaId} alunoId={alunoId} />}
          </div>
        )}

        {/* Enviando */}
        {estado === 'enviando' && (
          <div className="mt-16 flex flex-col items-center gap-5">
            <div className="w-14 h-14 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            <p className="font-bebas text-muted text-lg tracking-widest">ADICIONANDO À FILA...</p>
          </div>
        )}

        {/* Sucesso / Boosted */}
        {(estado === 'sucesso' || estado === 'boosted') && trackEnviada && (
          <div className="mt-6 flex flex-col gap-5">
            <div
              className="rounded-xl p-5 flex flex-col items-center gap-3 text-center"
              style={{
                background: '#1A1A1A',
                borderTop: estado === 'boosted' ? '3px solid #F5A800' : '3px solid #22c55e',
                borderLeft: '0.5px solid #2A2A2A',
                borderRight: '0.5px solid #2A2A2A',
                borderBottom: '0.5px solid #2A2A2A',
              }}
            >
              <p className="font-bebas text-gold text-2xl tracking-widest">
                {estado === 'boosted' ? '🔥 MÚSICA PRIORIZADA!' : '✓ MÚSICA ADICIONADA!'}
              </p>
              {estado === 'boosted' && (
                <p className="text-muted text-xs">Já estava na fila e foi re-adicionada com prioridade</p>
              )}
              <p className="text-white font-bold text-sm mt-1">{trackEnviada.name}</p>
              <p className="text-muted text-xs">{trackEnviada.artist}</p>
            </div>

            {academiaId && <FilaAluno academiaId={academiaId} alunoId={alunoId} />}

            <button
              onClick={() => setEstado('busca')}
              className="w-full bg-gold hover:bg-gold-light text-bg font-bebas rounded-xl"
              style={{ height: '52px', fontSize: '18px', letterSpacing: '2px' }}
            >
              SUGERIR OUTRA MÚSICA
            </button>
          </div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="mt-6 flex flex-col gap-5">
            <div
              className="rounded-xl p-5 flex flex-col items-center gap-3 text-center"
              style={{ background: '#1A1A1A', borderTop: '3px solid #FF4444', border: '0.5px solid #2A2A2A' }}
            >
              <p className="font-bebas text-danger text-2xl tracking-widest">NÃO FOI DESTA VEZ</p>
              <p className="text-muted text-sm max-w-xs">{erroEnvio}</p>
            </div>
            <button
              onClick={() => setEstado('busca')}
              className="w-full font-bebas rounded-xl"
              style={{ height: '52px', fontSize: '18px', letterSpacing: '2px', background: '#1A1A1A', color: '#999', border: '0.5px solid #2A2A2A' }}
            >
              TENTAR OUTRA MÚSICA
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
