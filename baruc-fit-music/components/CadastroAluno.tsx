'use client'

import { useState } from 'react'
import { mascaraTelefone, validarTelefone, formatarCPF, validarCPF } from '@/lib/telefone'

type Props = {
  academiaSlug: string
  onCadastro: (alunoId: string, nome: string) => void
}

export default function CadastroAluno({ academiaSlug, onCadastro }: Props) {
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const nomeValido = nome.trim().length >= 3
  const cpfValido = validarCPF(cpf)
  const telefoneValido = validarTelefone(telefone)
  const formValido = nomeValido && cpfValido && telefoneValido

  function handleCpf(valor: string) {
    setCpf(formatarCPF(valor))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!nomeValido) return setErro('Nome deve ter pelo menos 3 caracteres.')
    if (!cpfValido) return setErro('CPF inválido. Verifique o número digitado.')
    if (!telefoneValido) return setErro('Telefone inválido. Use o formato (XX) XXXXX-XXXX.')

    setLoading(true)
    try {
      const res = await fetch('/api/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cpf, telefone, academiaSlug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCadastro(data.id, data.nome)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <p className="text-white text-sm leading-relaxed">
          Para sugerir músicas, preencha seus dados abaixo.
        </p>
        <p className="text-muted text-xs mt-1">Usado apenas para controlar o limite diário.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="font-bebas text-muted text-xs mb-2 block" style={{ letterSpacing: '2px' }}>
            SEU NOME
          </label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Como te chamamos?"
            autoComplete="given-name"
            className="w-full bg-surface border rounded-xl px-4 py-3 text-white placeholder-muted"
            style={{ borderColor: nomeValido ? '#2A2A2A' : nome.length > 0 ? 'rgba(255,68,68,0.4)' : '#2A2A2A' }}
          />
        </div>

        <div>
          <label className="font-bebas text-muted text-xs mb-2 block" style={{ letterSpacing: '2px' }}>
            CPF
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cpf}
            onChange={e => handleCpf(e.target.value)}
            placeholder="000.000.000-00"
            autoComplete="off"
            className="w-full bg-surface border rounded-xl px-4 py-3 text-white placeholder-muted"
            style={{ borderColor: cpfValido ? '#2A2A2A' : cpf.length > 0 ? 'rgba(255,68,68,0.4)' : '#2A2A2A' }}
          />
        </div>

        <div>
          <label className="font-bebas text-muted text-xs mb-2 block" style={{ letterSpacing: '2px' }}>
            CELULAR
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={telefone}
            onChange={e => setTelefone(mascaraTelefone(e.target.value))}
            placeholder="(XX) XXXXX-XXXX"
            autoComplete="tel"
            className="w-full bg-surface border rounded-xl px-4 py-3 text-white placeholder-muted"
            style={{ borderColor: telefoneValido ? '#2A2A2A' : telefone.length > 0 ? 'rgba(255,68,68,0.4)' : '#2A2A2A' }}
          />
        </div>

        {erro && (
          <p className="text-danger text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)' }}>
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !formValido}
          className="w-full bg-gold hover:bg-gold-light text-bg font-bebas rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ height: '52px', fontSize: '18px', letterSpacing: '2px' }}
        >
          {loading ? 'ENTRANDO...' : 'ENTRAR E SUGERIR'}
        </button>

        <p className="text-center text-xs" style={{ color: '#444' }}>
          Seus dados são usados apenas para controle interno e não serão compartilhados (LGPD).
        </p>
      </form>
    </div>
  )
}
