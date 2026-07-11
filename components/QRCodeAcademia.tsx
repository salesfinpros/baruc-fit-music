'use client'

import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

type Props = {
  slug: string
  appUrl: string
  nomeAcademia: string
}

export default function QRCodeAcademia({ slug, appUrl, nomeAcademia }: Props) {
  const svgRef = useRef<HTMLDivElement>(null)
  const url = `${appUrl}/sugerir/${slug}`

  function baixarPNG() {
    const svg = svgRef.current?.querySelector('svg')
    if (!svg) return

    const canvas = document.createElement('canvas')
    const size = 512
    canvas.width = size
    canvas.height = size + 60

    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new window.Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size)
      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(nomeAcademia, size / 2, size + 30)
      ctx.fillStyle = '#71717a'
      ctx.font = '12px sans-serif'
      ctx.fillText('Escaneie para sugerir músicas', size / 2, size + 50)

      const a = document.createElement('a')
      a.download = `qrcode-${slug}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={svgRef}
        className="bg-white p-4 rounded-2xl"
      >
        <QRCodeSVG
          value={url}
          size={220}
          bgColor="#ffffff"
          fgColor="#000000"
          level="M"
        />
      </div>

      <p className="text-zinc-400 text-sm text-center break-all max-w-xs">{url}</p>

      <button
        onClick={baixarPNG}
        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl transition-colors text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Baixar PNG
      </button>
    </div>
  )
}
