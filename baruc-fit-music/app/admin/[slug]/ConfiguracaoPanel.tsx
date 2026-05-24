'use client'

import { useEffect, useState, useRef } from 'react'
import type { ConfigAcademia } from '@/lib/supabase'

type ItemBloqueado = { id: string; nome: string; artista?: string; imagemUrl: string | null }

export default function ConfiguracaoPanel({ academiaSlug }: { academiaSlug: string }) {
  const [config, setConfig] = useState<ConfigAcademia | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const [novoGenero, setNovoGenero] = useState('')
  const [novaMusicaId, setNovaMusicaId] = useState('')

  // Artistas
  const [buscaArtista, setBuscaArtista] = useState('')
  const [resultadosArtista, setResultadosArtista] = useState<ItemBloqueado[]>([])
  const [buscandoArtista, setBuscandoArtista] = useState(false)
  const artistaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Álbuns
  const [buscaAlbum, setBuscaAlbum] = useState('')
  const [resultadosAlbum, setResultadosAlbum] = useState<ItemBloqueado[]>([])
  const [buscandoAlbum, setBuscandoAlbum] = useState(false)
  const albumTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(data => { setConfig(data); setLoading(false) })
  }, [])

  async function salvar(campos: Partial<ConfigAcademia>) {
    setSalvando(true)
    setMensagem(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campos),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMensagem({ tipo: 'ok', texto: 'Configurações salvas!' })
      setTimeout(() => setMensagem(null), 3000)
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar configurações.' })
    } finally {
      setSalvando(false)
    }
  }

  function adicionarGenero() {
    if (!config || !novoGenero.trim()) return
    const updated = [...config.generos_bloqueados, novoGenero.trim().toLowerCase()]
    const newConfig = { ...config, generos_bloqueados: updated }
    setConfig(newConfig)
    salvar({ generos_bloqueados: updated })
    setNovoGenero('')
  }

  function removerGenero(g: string) {
    if (!config) return
    const updated = config.generos_bloqueados.filter(x => x !== g)
    const newConfig = { ...config, generos_bloqueados: updated }
    setConfig(newConfig)
    salvar({ generos_bloqueados: updated })
  }

  function adicionarMusica() {
    if (!config || !novaMusicaId.trim()) return
    const id = novaMusicaId.trim()
    const updated = [...config.musicas_bloqueadas, id]
    const newConfig = { ...config, musicas_bloqueadas: updated }
    setConfig(newConfig)
    salvar({ musicas_bloqueadas: updated })
    setNovaMusicaId('')
  }

  function removerMusica(id: string) {
    if (!config) return
    const updated = config.musicas_bloqueadas.filter(x => x !== id)
    const newConfig = { ...config, musicas_bloqueadas: updated }
    setConfig(newConfig)
    salvar({ musicas_bloqueadas: updated })
  }

  function handleBuscaArtista(valor: string) {
    setBuscaArtista(valor)
    if (artistaTimer.current) clearTimeout(artistaTimer.current)
    if (!valor.trim()) { setResultadosArtista([]); return }
    artistaTimer.current = setTimeout(async () => {
      setBuscandoArtista(true)
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(valor)}&type=artist&slug=${academiaSlug}`)
        const data = await res.json()
        setResultadosArtista(data.artists ?? [])
      } catch { setResultadosArtista([]) }
      finally { setBuscandoArtista(false) }
    }, 300)
  }

  function adicionarArtista(artista: ItemBloqueado) {
    if (!config) return
    const entry = JSON.stringify({ id: artista.id, nome: artista.nome })
    const existing = config.artistas_bloqueados ?? []
    if (existing.some(e => { try { return JSON.parse(e).id === artista.id } catch { return false } })) return
    const updated = [...existing, entry]
    const newConfig = { ...config, artistas_bloqueados: updated }
    setConfig(newConfig)
    salvar({ artistas_bloqueados: updated })
    setBuscaArtista('')
    setResultadosArtista([])
  }

  function removerArtista(entry: string) {
    if (!config) return
    const updated = (config.artistas_bloqueados ?? []).filter(e => e !== entry)
    const newConfig = { ...config, artistas_bloqueados: updated }
    setConfig(newConfig)
    salvar({ artistas_bloqueados: updated })
  }

  function handleBuscaAlbum(valor: string) {
    setBuscaAlbum(valor)
    if (albumTimer.current) clearTimeout(albumTimer.current)
    if (!valor.trim()) { setResultadosAlbum([]); return }
    albumTimer.current = setTimeout(async () => {
      setBuscandoAlbum(true)
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(valor)}&type=album&slug=${academiaSlug}`)
        const data = await res.json()
        setResultadosAlbum(data.albums ?? [])
      } catch { setResultadosAlbum([]) }
      finally { setBuscandoAlbum(false) }
    }, 300)
  }

  function adicionarAlbum(album: ItemBloqueado) {
    if (!config) return
    const entry = JSON.stringify({ id: album.id, nome: album.nome, artista: album.artista })
    const existing = config.albuns_bloqueados ?? []
    if (existing.some(e => { try { return JSON.parse(e).id === album.id } catch { return false } })) return
    const updated = [...existing, entry]
    const newConfig = { ...config, albuns_bloqueados: updated }
    setConfig(newConfig)
    salvar({ albuns_bloqueados: updated })
    setBuscaAlbum('')
    setResultadosAlbum([])
  }

  function removerAlbum(entry: string) {
    if (!config) return
    const updated = (config.albuns_bloqueados ?? []).filter(e => e !== entry)
    const newConfig = { ...config, albuns_bloqueados: updated }
    setConfig(newConfig)
    salvar({ albuns_bloqueados: updated })
  }

  function parseEntry(entry: string): { id: string; nome: string; artista?: string } {
    try { return JSON.parse(entry) } catch { return { id: entry, nome: entry } }
  }

  if (loading) {
    return <div className="text-zinc-500 text-center py-8">Carregando configurações...</div>
  }

  if (!config) return null

  return (
    <div className="flex flex-col gap-6">
      {mensagem && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          mensagem.tipo === 'ok'
            ? 'bg-green-400/10 border-green-400/20 text-green-400'
            : 'bg-red-400/10 border-red-400/20 text-red-400'
        }`}>
          {mensagem.texto}
        </div>
      )}

      {/* Limites gerais */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex flex-col gap-4">
        <h3 className="text-white font-semibold">Limites</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Sugestões por aluno/dia</p>
            <p className="text-xs text-zinc-500">Máximo de sugestões diárias</p>
          </div>
          <input
            type="number"
            min={1}
            max={20}
            value={config.limite_sugestoes_aluno_por_dia}
            onChange={e => setConfig({ ...config, limite_sugestoes_aluno_por_dia: +e.target.value })}
            onBlur={() => salvar({ limite_sugestoes_aluno_por_dia: config.limite_sugestoes_aluno_por_dia })}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-center focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Duração máxima (minutos)</p>
            <p className="text-xs text-zinc-500">Músicas mais longas são bloqueadas</p>
          </div>
          <input
            type="number"
            min={1}
            max={30}
            value={Math.round(config.duracao_maxima_ms / 60000)}
            onChange={e => setConfig({ ...config, duracao_maxima_ms: +e.target.value * 60000 })}
            onBlur={() => salvar({ duracao_maxima_ms: config.duracao_maxima_ms })}
            className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-white text-center focus:outline-none focus:border-yellow-400"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Bloquear conteúdo explícito</p>
            <p className="text-xs text-zinc-500">Músicas marcadas como explícitas no Spotify</p>
          </div>
          <button
            onClick={() => {
              const updated = { ...config, bloquear_explicitas: !config.bloquear_explicitas }
              setConfig(updated)
              salvar({ bloquear_explicitas: updated.bloquear_explicitas })
            }}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              config.bloquear_explicitas ? 'bg-yellow-400' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                config.bloquear_explicitas ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Gêneros bloqueados */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex flex-col gap-4">
        <h3 className="text-white font-semibold">Gêneros bloqueados</h3>

        <div className="flex flex-wrap gap-2">
          {config.generos_bloqueados.map(g => (
            <div key={g} className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-3 py-1.5">
              <span className="text-zinc-300 text-sm">{g}</span>
              <button
                onClick={() => removerGenero(g)}
                className="text-zinc-600 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={novoGenero}
            onChange={e => setNovoGenero(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarGenero()}
            placeholder="funk, sertanejo..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-yellow-400"
          />
          <button
            onClick={adicionarGenero}
            disabled={salvando}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Artistas bloqueados */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
        <div>
          <h3 className="text-white font-semibold">Artistas bloqueados</h3>
          <p className="text-xs mt-0.5" style={{ color: '#666' }}>Busque pelo nome do artista no Spotify</p>
        </div>

        {(config.artistas_bloqueados ?? []).length > 0 && (
          <div className="flex flex-col gap-2">
            {(config.artistas_bloqueados ?? []).map(entry => {
              const item = parseEntry(entry)
              return (
                <div key={entry} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#2A2A2A' }}>
                  <span className="text-white text-sm">{item.nome}</span>
                  <button
                    onClick={() => removerArtista(entry)}
                    className="text-xs ml-3 flex-shrink-0 transition-colors"
                    style={{ color: '#666' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#666')}
                  >
                    Remover
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={buscaArtista}
            onChange={e => handleBuscaArtista(e.target.value)}
            placeholder="Buscar artista..."
            className="w-full rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
            style={{ background: '#2A2A2A', border: '0.5px solid #333', color: 'white' }}
          />
          {buscandoArtista && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {resultadosArtista.length > 0 && (
          <div className="flex flex-col gap-1 rounded-xl overflow-hidden" style={{ border: '0.5px solid #333' }}>
            {resultadosArtista.map(artista => (
              <button
                key={artista.id}
                onClick={() => adicionarArtista(artista)}
                className="flex items-center gap-3 px-3 py-2.5 text-left w-full transition-colors"
                style={{ background: '#222' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2A2A2A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#222')}
              >
                {artista.imagemUrl ? (
                  <img src={artista.imagemUrl} alt={artista.nome} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm" style={{ background: '#333', color: '#666' }}>♪</div>
                )}
                <span className="text-white text-sm truncate">{artista.nome}</span>
                <span className="text-xs ml-auto flex-shrink-0" style={{ color: '#F5A800' }}>+ Bloquear</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Álbuns bloqueados */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
        <div>
          <h3 className="text-white font-semibold">Álbuns bloqueados</h3>
          <p className="text-xs mt-0.5" style={{ color: '#666' }}>Busque pelo nome do álbum no Spotify</p>
        </div>

        {(config.albuns_bloqueados ?? []).length > 0 && (
          <div className="flex flex-col gap-2">
            {(config.albuns_bloqueados ?? []).map(entry => {
              const item = parseEntry(entry)
              return (
                <div key={entry} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: '#2A2A2A' }}>
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">{item.nome}</p>
                    {item.artista && <p className="text-xs truncate" style={{ color: '#666' }}>{item.artista}</p>}
                  </div>
                  <button
                    onClick={() => removerAlbum(entry)}
                    className="text-xs ml-3 flex-shrink-0 transition-colors"
                    style={{ color: '#666' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#666')}
                  >
                    Remover
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            value={buscaAlbum}
            onChange={e => handleBuscaAlbum(e.target.value)}
            placeholder="Buscar álbum..."
            className="w-full rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
            style={{ background: '#2A2A2A', border: '0.5px solid #333', color: 'white' }}
          />
          {buscandoAlbum && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {resultadosAlbum.length > 0 && (
          <div className="flex flex-col gap-1 rounded-xl overflow-hidden" style={{ border: '0.5px solid #333' }}>
            {resultadosAlbum.map(album => (
              <button
                key={album.id}
                onClick={() => adicionarAlbum(album)}
                className="flex items-center gap-3 px-3 py-2.5 text-left w-full transition-colors"
                style={{ background: '#222' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2A2A2A')}
                onMouseLeave={e => (e.currentTarget.style.background = '#222')}
              >
                {album.imagemUrl ? (
                  <img src={album.imagemUrl} alt={album.nome} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-sm" style={{ background: '#333', color: '#666' }}>♪</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm truncate">{album.nome}</p>
                  {album.artista && <p className="text-xs truncate" style={{ color: '#666' }}>{album.artista}</p>}
                </div>
                <span className="text-xs ml-auto flex-shrink-0" style={{ color: '#F5A800' }}>+ Bloquear</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Músicas bloqueadas */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 flex flex-col gap-4">
        <h3 className="text-white font-semibold">Músicas bloqueadas</h3>
        <p className="text-zinc-500 text-xs -mt-2">
          Cole o ID do track do Spotify (ex: <span className="text-zinc-400">4cOdK2wGLETKBW3PvgPWqT</span>)
        </p>

        {config.musicas_bloqueadas.length > 0 && (
          <div className="flex flex-col gap-2">
            {config.musicas_bloqueadas.map(id => (
              <div key={id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                <span className="text-zinc-400 text-xs font-mono truncate">{id}</span>
                <button
                  onClick={() => removerMusica(id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={novaMusicaId}
            onChange={e => setNovaMusicaId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && adicionarMusica()}
            placeholder="ID do track Spotify"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-600 text-sm font-mono focus:outline-none focus:border-yellow-400"
          />
          <button
            onClick={adicionarMusica}
            disabled={salvando}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
          >
            Bloquear
          </button>
        </div>
      </div>
    </div>
  )
}
