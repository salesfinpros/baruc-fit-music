'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginAdmin() {
  const router = useRouter()
  const [slug, setSlug] = useState('umirim')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha, slug }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      router.push(`/admin/${slug}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Baruc Fit Music" width={96} height={96} className="object-contain" priority />
          <p className="font-bebas text-gold mt-3 text-lg" style={{ letterSpacing: '4px' }}>
            PAINEL ADMIN
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-surface rounded-xl p-6 flex flex-col gap-5"
          style={{ border: '0.5px solid #2A2A2A' }}
        >
          <div>
            <label className="font-bebas text-muted text-xs mb-2 block" style={{ letterSpacing: '2px' }}>
              ACADEMIA
            </label>
            <select
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="w-full bg-bg border rounded-xl px-4 py-3 text-white"
              style={{ borderColor: '#2A2A2A' }}
            >
              <option value="umirim">Academia Umirim</option>
              <option value="sao-luis-do-curu">Academia São Luís do Curu</option>
            </select>
          </div>

          <div>
            <label className="font-bebas text-muted text-xs mb-2 block" style={{ letterSpacing: '2px' }}>
              SENHA
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-bg border rounded-xl px-4 py-3 text-white"
              style={{ borderColor: '#2A2A2A' }}
            />
          </div>

          {erro && (
            <p className="text-danger text-sm rounded-xl px-4 py-3" style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)' }}>
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold-light text-bg font-bebas rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ height: '52px', fontSize: '18px', letterSpacing: '2px' }}
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  )
}
