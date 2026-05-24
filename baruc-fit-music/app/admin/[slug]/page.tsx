import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getAdminSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import PainelClient from './PainelClient'

type Props = { params: Promise<{ slug: string }> }

export default async function PainelAdmin({ params }: Props) {
  const { slug } = await params
  const session = await getAdminSession()

  if (!session || session.academiaSlug !== slug) {
    redirect(`/admin/login`)
  }

  const db = supabaseAdmin()
  const { data: academia } = await db
    .from('academias')
    .select('id, nome, slug, spotify_access_token, rede_id, redes(nome)')
    .eq('slug', slug)
    .single()

  if (!academia) redirect('/admin/login')

  const rede = (academia as { redes?: { nome: string } | null }).redes

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PainelClient
        academia={{
          id: academia.id,
          nome: academia.nome,
          slug: academia.slug,
          spotifyConectado: !!academia.spotify_access_token,
          redeId: (academia as { rede_id?: string | null }).rede_id ?? null,
          redeNome: rede?.nome ?? null,
        }}
        appUrl={process.env.NEXT_PUBLIC_APP_URL!}
      />
    </Suspense>
  )
}
