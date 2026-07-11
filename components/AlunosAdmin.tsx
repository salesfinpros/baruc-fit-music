'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

type Aluno = {
  id: string
  nome: string
  telefone: string
  cpf: string | null
  total_sugestoes_hoje: number
  suspenso: boolean
  motivo_suspensao: string | null
  suspenso_em: string | null
  created_at: string
}

type Paginacao = {
  total: number
  pagina: number
  totalPaginas: number
}

function formatTelefone(tel: string): string {
  const d = tel.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return tel
}

export default function AlunosAdmin({ academiaId }: { academiaId: string }) {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [paginacao, setPaginacao] = useState<Paginacao>({ total: 0, pagina: 1, totalPaginas: 1 })
  const [modalAluno, setModalAluno] = useState<Aluno | null>(null)
  const [motivo, setMotivo] = useState('')
  const [acao, setAcao] = useState<string | null>(null)
  const buscaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAlunos = useCallback(async (pagina = 1, q = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(pagina), q })
      const res = await fetch(`/api/admin/alunos?${params}`)
      const data = await res.json()
      setAlunos(data.alunos ?? [])
      setPaginacao({ total: data.total ?? 0, pagina: data.pagina ?? 1, totalPaginas: data.totalPaginas ?? 1 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAlunos() }, [fetchAlunos])

  function handleBusca(valor: string) {
    setBusca(valor)
    if (buscaTimer.current) clearTimeout(buscaTimer.current)
    buscaTimer.current = setTimeout(() => fetchAlunos(1, valor), 400)
  }

  async function suspender() {
    if (!modalAluno || !motivo.trim()) return
    setAcao(modalAluno.id)
    await fetch(`/api/admin/alunos/${modalAluno.id}/suspender`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo }),
    })
    setModalAluno(null)
    setMotivo('')
    setAcao(null)
    fetchAlunos(paginacao.pagina, busca)
  }

  async function reativar(alunoId: string) {
    setAcao(alunoId)
    await fetch(`/api/admin/alunos/${alunoId}/suspender`, { method: 'DELETE' })
    setAcao(null)
    fetchAlunos(paginacao.pagina, busca)
  }

  async function excluir(alunoId: string) {
    if (!confirm('Excluir este aluno e todos os dados? Esta ação não pode ser desfeita (LGPD).')) return
    setAcao(alunoId)
    await fetch(`/api/admin/alunos?alunoId=${alunoId}`, { method: 'DELETE' })
    setAcao(null)
    fetchAlunos(paginacao.pagina, busca)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de busca */}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4" style={{ color: '#555' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={busca}
          onChange={e => handleBusca(e.target.value)}
          placeholder="Buscar por nome, telefone ou CPF..."
          className="w-full rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none"
          style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
        />
      </div>

      {/* Contador */}
      <p className="font-bebas text-xs tracking-widest" style={{ color: '#555' }}>
        {paginacao.total} ALUNO{paginacao.total !== 1 ? 'S' : ''} CADASTRADO{paginacao.total !== 1 ? 'S' : ''}
      </p>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alunos.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-bebas text-2xl tracking-widest" style={{ color: '#555' }}>SEM ALUNOS</p>
          <p className="text-sm mt-1" style={{ color: '#555' }}>Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alunos.map(aluno => (
            <div
              key={aluno.id}
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{
                background: '#1A1A1A',
                border: aluno.suspenso ? '0.5px solid rgba(255,68,68,0.4)' : '0.5px solid #2A2A2A',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm truncate">{aluno.nome}</p>
                    {aluno.suspenso && (
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-bold" style={{ background: 'rgba(255,68,68,0.15)', color: '#FF4444' }}>
                        SUSPENSO
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#666' }}>{formatTelefone(aluno.telefone)}</p>
                  {aluno.cpf && <p className="text-xs" style={{ color: '#555' }}>CPF: {aluno.cpf}</p>}
                  {aluno.suspenso && aluno.motivo_suspensao && (
                    <p className="text-xs mt-1" style={{ color: '#FF4444' }}>Motivo: {aluno.motivo_suspensao}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs" style={{ color: '#555' }}>
                    {aluno.total_sugestoes_hoje} sugestão(ões) hoje
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1" style={{ borderTop: '0.5px solid #2A2A2A' }}>
                {aluno.suspenso ? (
                  <button
                    onClick={() => reativar(aluno.id)}
                    disabled={acao === aluno.id}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '0.5px solid rgba(34,197,94,0.3)' }}
                  >
                    {acao === aluno.id ? '...' : 'Reativar'}
                  </button>
                ) : (
                  <button
                    onClick={() => { setModalAluno(aluno); setMotivo('') }}
                    disabled={acao === aluno.id}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(255,168,0,0.1)', color: '#F5A800', border: '0.5px solid rgba(255,168,0,0.3)' }}
                  >
                    Suspender
                  </button>
                )}
                <button
                  onClick={() => excluir(aluno.id)}
                  disabled={acao === aluno.id}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(255,68,68,0.08)', color: '#FF4444', border: '0.5px solid rgba(255,68,68,0.2)' }}
                >
                  {acao === aluno.id ? '...' : 'Excluir (LGPD)'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {paginacao.totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => fetchAlunos(paginacao.pagina - 1, busca)}
            disabled={paginacao.pagina <= 1}
            className="text-sm px-4 py-2 rounded-xl disabled:opacity-40 transition-colors"
            style={{ background: '#1A1A1A', color: '#999', border: '0.5px solid #2A2A2A' }}
          >
            ← Anterior
          </button>
          <span className="text-sm" style={{ color: '#555' }}>
            {paginacao.pagina} / {paginacao.totalPaginas}
          </span>
          <button
            onClick={() => fetchAlunos(paginacao.pagina + 1, busca)}
            disabled={paginacao.pagina >= paginacao.totalPaginas}
            className="text-sm px-4 py-2 rounded-xl disabled:opacity-40 transition-colors"
            style={{ background: '#1A1A1A', color: '#999', border: '0.5px solid #2A2A2A' }}
          >
            Próxima →
          </button>
        </div>
      )}

      {/* Modal suspensão */}
      {modalAluno && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="rounded-2xl p-6 flex flex-col gap-4 w-full max-w-sm" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
            <p className="font-bebas text-gold text-lg tracking-widest">SUSPENDER ALUNO</p>
            <p className="text-white text-sm">
              Suspender <span className="text-gold">{modalAluno.nome}</span>? O aluno não poderá mais sugerir músicas.
            </p>
            <div>
              <label className="font-bebas text-xs block mb-2" style={{ color: '#999', letterSpacing: '2px' }}>
                MOTIVO DA SUSPENSÃO
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none"
                style={{ background: '#2A2A2A', border: '0.5px solid #333' }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModalAluno(null)}
                className="flex-1 rounded-xl font-bebas text-sm py-3 transition-colors"
                style={{ background: '#2A2A2A', color: '#999', letterSpacing: '1px' }}
              >
                CANCELAR
              </button>
              <button
                onClick={suspender}
                disabled={!motivo.trim()}
                className="flex-1 rounded-xl font-bebas text-sm py-3 transition-colors disabled:opacity-40"
                style={{ background: '#FF4444', color: '#fff', letterSpacing: '1px' }}
              >
                SUSPENDER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
