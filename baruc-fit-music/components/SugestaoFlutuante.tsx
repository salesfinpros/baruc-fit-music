'use client'

import { useState } from 'react'

type Props = {
  academiaSlug: string
  alunoId: string | null
}

export default function SugestaoFlutuante({ academiaSlug, alunoId }: Props) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar() {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    try {
      await fetch('/api/sugestoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academiaSlug, alunoId, texto: texto.trim() }),
      })
      setEnviado(true)
      setTexto('')
      setTimeout(() => {
        setEnviado(false)
        setAberto(false)
      }, 2500)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(true)}
        className="fixed bottom-6 right-4 flex items-center gap-2 px-4 py-2.5 rounded-full font-bebas text-xs z-40 shadow-lg"
        style={{
          background: '#1A1A1A',
          border: '0.5px solid rgba(245,168,0,0.5)',
          color: '#F5A800',
          letterSpacing: '1.5px',
        }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.001 3.001 0 00-.765 1.274l-.282 1.13a1 1 0 01-.97.766H9.948a1 1 0 01-.97-.766l-.282-1.13a3 3 0 00-.765-1.274l-.347-.347z" />
        </svg>
        SUGESTÃO
      </button>

      {/* Overlay + modal */}
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) setAberto(false) }}
        >
          <div
            className="w-full max-w-md rounded-t-2xl p-5 pb-10"
            style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-1">
              <p className="font-bebas text-gold tracking-widest text-base">💡 SUGESTÃO DE MELHORIA</p>
              <button
                onClick={() => setAberto(false)}
                className="p-1 rounded-lg"
                style={{ color: '#555' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {enviado ? (
              <div className="text-center py-8">
                <p className="font-bebas text-gold text-2xl tracking-widest">✓ ENVIADO!</p>
                <p className="text-muted text-sm mt-2">Obrigado pela sua sugestão!</p>
              </div>
            ) : (
              <>
                <p className="text-xs mb-4" style={{ color: '#666' }}>
                  Tem alguma ideia para melhorar o app? Conta pra gente!
                </p>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Ex: Seria legal poder ver quantas músicas faltam para a minha tocar..."
                  className="w-full rounded-xl px-4 py-3 text-white text-sm resize-none outline-none"
                  style={{
                    background: '#0D0D0D',
                    border: '0.5px solid #2A2A2A',
                    lineHeight: '1.5',
                  }}
                  autoFocus
                />
                <div className="flex items-center justify-end mt-1 mb-4">
                  <span className="text-xs" style={{ color: '#444' }}>{texto.length}/500</span>
                </div>
                <button
                  onClick={enviar}
                  disabled={!texto.trim() || enviando}
                  className="w-full bg-gold text-bg font-bebas rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ height: '48px', fontSize: '16px', letterSpacing: '2px' }}
                >
                  {enviando ? 'ENVIANDO...' : 'ENVIAR SUGESTÃO'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
