'use client'

import { useEffect, useState } from 'react'

type Sugestao = {
  id: string
  texto: string
  created_at: string
  alunos: { nome: string } | null
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

export default function SugestoesAdmin({ academiaSlug }: { academiaSlug: string }) {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sugestoes?slug=${academiaSlug}`)
      .then(r => r.json())
      .then(data => setSugestoes(data.sugestoes ?? []))
      .finally(() => setLoading(false))
  }, [academiaSlug])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (sugestoes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="font-bebas text-muted text-2xl tracking-widest">SEM SUGESTÕES</p>
        <p className="text-muted text-sm mt-1">Nenhuma sugestão enviada pelos alunos ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="font-bebas text-muted text-xs tracking-widest mb-4">
        {sugestoes.length} SUGESTÃO{sugestoes.length !== 1 ? 'ÕES' : ''} RECEBIDA{sugestoes.length !== 1 ? 'S' : ''}
      </p>
      {sugestoes.map(s => (
        <div
          key={s.id}
          className="rounded-xl p-4"
          style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
        >
          <p className="text-white text-sm leading-relaxed">{s.texto}</p>
          <p className="text-xs mt-3" style={{ color: '#555' }}>
            {s.alunos?.nome
              ? <>Por <span className="text-muted">{s.alunos.nome}</span> · </>
              : 'Anônimo · '
            }
            {formatDatetime(s.created_at)}
          </p>
        </div>
      ))}
    </div>
  )
}
