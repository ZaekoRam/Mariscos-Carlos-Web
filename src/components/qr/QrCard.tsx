import { motion } from 'motion/react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import logo from '../../assets/logo.svg'
import { SITE } from '../../config/site'
import { cardHover, staggerItem } from '../../lib/motion'
import { CtaButton } from '../CtaButton'
import { CheckIcon, DownloadIcon } from '../icons'
import { downloadQrCard } from './downloadQrCard'
import type { DownloadResult } from './downloadQrCard'

const QR_FG = '#13324A'
const QR_BG = '#FFFFFF'

/** Tarjeta tipo "tent card" con el QR de una mesa, lista para imprimir o descargar. */
export default function QrCard({
  mesa,
  url,
  shortUrl,
  onDownloaded,
}: {
  mesa: number
  url: string
  shortUrl: string
  onDownloaded: (mesa: number, result: DownloadResult) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const label = `Código QR para la mesa ${mesa}`

  useEffect(() => {
    if (state !== 'done') return
    const id = window.setTimeout(() => setState('idle'), 2200)
    return () => window.clearTimeout(id)
  }, [state])

  async function handleDownload() {
    if (state === 'busy') return
    setState('busy')
    let result: DownloadResult = 'error'
    try {
      result = await downloadQrCard({
        mesa,
        qrCanvas: canvasRef.current,
        qrSvg: svgRef.current,
        logoSrc: logo,
        shortUrl,
      })
    } catch {
      result = 'error'
    }
    setState(result === 'error' ? 'idle' : 'done')
    onDownloaded(mesa, result)
  }

  return (
    <motion.li
      layout
      variants={staggerItem}
      whileHover={cardHover}
      className="relative flex flex-col items-center rounded-3xl border border-deep/10 bg-white/80 px-3 pt-5 pb-3 text-center shadow-[0_18px_40px_-24px_rgb(19_50_74/0.45)] transition-shadow duration-300 hover:shadow-lg sm:px-5 sm:pt-7 sm:pb-5 print:break-inside-avoid print:border-deep/30 print:bg-white print:opacity-100! print:shadow-none print:transform-none!"
    >
      {/* Línea de doblez de la tarjeta */}
      <span aria-hidden="true" className="absolute inset-x-6 top-2.5 border-t border-dashed border-deep/20" />

      <div className="flex items-center justify-center gap-1.5">
        <img src={logo} alt="" width={32} height={32} className="size-6 sm:size-8" />
        <span className="text-[10px] font-semibold tracking-[0.16em] text-ocean-deep uppercase sm:text-[11px]">
          {SITE.nombre}
        </span>
      </div>

      <h3 className="mt-2 leading-none text-deep">
        <span className="font-display text-xl italic sm:text-2xl">Mesa </span>
        <span className="font-display text-4xl font-medium text-sunset sm:text-5xl">{mesa}</span>
      </h3>

      <div className="mt-3 w-full rounded-2xl border border-deep/10 bg-foam p-2 sm:p-3">
        <QRCodeSVG
          ref={svgRef}
          value={url}
          size={256}
          level="M"
          marginSize={1}
          fgColor={QR_FG}
          bgColor={QR_BG}
          title={label}
          role="img"
          aria-label={label}
          className="block rounded-lg"
          style={{ width: '100%', height: 'auto' }}
        />
      </div>

      <p className="mt-3 text-xs leading-snug font-medium text-balance text-deep sm:text-sm">
        Escanea para ver el menú y pedir
      </p>
      <p className="mt-1 font-mono text-[10px] break-all text-ocean-deep sm:text-xs">{shortUrl}</p>

      <div className="no-print mt-3 w-full sm:mt-4">
        <CtaButton
          variant={state === 'done' ? 'ocean' : 'outline'}
          size="sm"
          className="w-full px-3"
          onClick={handleDownload}
          disabled={state === 'busy'}
          aria-label={`Descargar tarjeta QR de la mesa ${mesa}`}
          icon={state === 'done' ? <CheckIcon className="size-4" /> : <DownloadIcon className="size-4" />}
        >
          {state === 'busy' ? 'Generando…' : state === 'done' ? 'Lista' : 'Descargar'}
        </CtaButton>
      </div>

      {/* Lienzo oculto en alta resolución para la descarga en PNG */}
      <QRCodeCanvas
        ref={canvasRef}
        value={url}
        size={520}
        level="M"
        marginSize={2}
        fgColor={QR_FG}
        bgColor={QR_BG}
        aria-hidden="true"
        className="hidden"
      />
    </motion.li>
  )
}
