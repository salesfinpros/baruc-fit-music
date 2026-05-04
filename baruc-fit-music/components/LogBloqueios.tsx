'use client'

import { useEffect, useState } from 'react'
import { supabase, BloqueioLog } from '@/lib/supabase'

const motivoLabel: Record<string, string> = {
  genero_bloqueado: 'Gênero bloqueado',
  musica_bloqueada: 'Música na blacklist',
  duplicada: 'Já na fila',
  limite_aluno: 'Limite diário',
  musica_explicita: 'Conteúdo explícito',
  duracao_excedida: 'Duração excedida',
}

const motivoColor: Record<string, string> = {
  genero_bloqueado: 'text-orange-400 bg-orange-400/10',
  musica_bloqueada: 'text-red-400 bg-red-400/10',
  duplicada: 'text-blue-400 bg-blue-400/10',
  limite_aluno: 'text-purple-400 bg-purple-400/10',
  musica_explicita: 'text-pink-400 bg-pink-400/10',
  duracao_excedida: 'text-yellow-400 bg-yellow-400/10',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

type Props = { academiaId: string }

export default function LogBloqueios({ academiaId }: Props) {
  const [logs, setLogs] = useState<BloqueioLog[]>([])

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
      {logs.map(log => (
        <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate font-medium">{log.nome_musica}</p>
            <p className="text-muted text-xs truncate">{log.artista}</p>
            {log.genero_detectado && (
              <p className="text-xs mt-0.5" style={{ color: '#555' }}>Gênero: {log.genero_detectado}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${motivoColor[log.motivo] ?? 'text-muted'}`}>
              {motivoLabel[log.motivo] ?? log.motivo}
            </span>
            <span className="text-xs" style={{ color: '#555' }}>{formatTime(log.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
