import { SITE } from '../../config/site'

/**
 * Descarga de tarjetas QR. Se compone una tarjeta tipo "tent card" en un canvas
 * (logo, "Mesa N", QR, instrucciones y URL) y se exporta como PNG.
 * Si algo falla se intenta sólo el QR en PNG y, al final, el SVG visible.
 */

export type DownloadResult = 'png' | 'svg' | 'error'

const COLORS = {
  sand: '#F4E9D8',
  foam: '#FBF6EC',
  deep: '#13324A',
  ocean: '#1C7C9C',
  oceanDeep: '#16657F',
  sunset: '#E8552B',
  gold: '#F2B134',
}

const DISPLAY_FONT = "'Fraunces', Georgia, 'Times New Roman', serif"
const SANS_FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"

export function fileBaseName(mesa: number): string {
  return `mesa-${mesa}-mariscos-carlos`
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawWave(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, amplitude: number, period: number) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let px = 0; px <= width; px += 4) {
    ctx.lineTo(x + px, y + Math.sin((px / period) * Math.PI * 2) * amplitude)
  }
  ctx.stroke()
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = src
    await img.decode()
    return img
  } catch {
    return null
  }
}

async function fontsReady() {
  try {
    if (document.fonts) await document.fonts.ready
  } catch {
    // Sin fuentes web se usan las de respaldo.
  }
}

/** Dibuja la tarjeta completa. Devuelve el canvas o null si el navegador no lo permite. */
async function composeCard({
  mesa,
  qrCanvas,
  logoSrc,
  shortUrl,
}: {
  mesa: number
  qrCanvas: HTMLCanvasElement
  logoSrc: string
  shortUrl: string
}): Promise<HTMLCanvasElement | null> {
  const W = 900
  const H = 1280
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  await fontsReady()
  const logo = await loadImage(logoSrc)

  // Fondo arena y tarjeta blanca
  ctx.fillStyle = COLORS.sand
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.shadowColor = 'rgba(19, 50, 74, 0.18)'
  ctx.shadowBlur = 40
  ctx.shadowOffsetY = 18
  roundedRect(ctx, 48, 48, W - 96, H - 96, 56)
  ctx.fillStyle = '#FFFFFF'
  ctx.fill()
  ctx.restore()

  // Línea de doblez (tent card)
  ctx.save()
  ctx.strokeStyle = 'rgba(19, 50, 74, 0.22)'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(110, 96)
  ctx.lineTo(W - 110, 96)
  ctx.stroke()
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // Logo y nombre
  if (logo) {
    try {
      ctx.drawImage(logo, W / 2 - 52, 128, 104, 104)
    } catch {
      // Si el logo no se puede dibujar, la tarjeta sigue sin él.
    }
  }
  ctx.fillStyle = COLORS.oceanDeep
  ctx.font = `600 26px ${SANS_FONT}`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '6px'
  ctx.fillText(SITE.nombre.toUpperCase(), W / 2, 280)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'

  // Mesa N
  const mesaWord = 'Mesa '
  ctx.font = `italic 400 64px ${DISPLAY_FONT}`
  const wordWidth = ctx.measureText(mesaWord).width
  ctx.font = `500 132px ${DISPLAY_FONT}`
  const numberText = String(mesa)
  const numberWidth = ctx.measureText(numberText).width
  const startX = W / 2 - (wordWidth + numberWidth) / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.deep
  ctx.font = `italic 400 64px ${DISPLAY_FONT}`
  ctx.fillText(mesaWord, startX, 412)
  ctx.fillStyle = COLORS.sunset
  ctx.font = `500 132px ${DISPLAY_FONT}`
  ctx.fillText(numberText, startX + wordWidth, 412)
  ctx.textAlign = 'center'

  // QR sobre un marco suave
  const qrSize = 520
  const qrX = (W - qrSize) / 2
  const qrY = 460
  roundedRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 36)
  ctx.fillStyle = COLORS.foam
  ctx.fill()
  ctx.strokeStyle = 'rgba(19, 50, 74, 0.12)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)
  ctx.imageSmoothingEnabled = true

  // Instrucciones y URL
  ctx.fillStyle = COLORS.deep
  ctx.font = `500 36px ${SANS_FONT}`
  ctx.fillText('Escanea para ver el menú y pedir', W / 2, 1076)
  ctx.fillStyle = COLORS.oceanDeep
  ctx.font = `500 26px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace`
  ctx.fillText(shortUrl, W / 2, 1122, W - 200)

  // Olas decorativas
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.strokeStyle = COLORS.ocean
  drawWave(ctx, 300, 1168, 300, 6, 60)
  ctx.strokeStyle = COLORS.gold
  drawWave(ctx, 330, 1190, 240, 6, 60)

  return canvas
}

function downloadSvg(svg: SVGSVGElement | null, mesa: number): boolean {
  if (!svg) return false
  try {
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    const markup = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${markup}`], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, `${fileBaseName(mesa)}.svg`)
    window.setTimeout(() => URL.revokeObjectURL(url), 4000)
    return true
  } catch {
    return false
  }
}

/** Descarga la tarjeta de la mesa como PNG (con respaldo a QR solo y a SVG). */
export async function downloadQrCard({
  mesa,
  qrCanvas,
  qrSvg,
  logoSrc,
  shortUrl,
}: {
  mesa: number
  qrCanvas: HTMLCanvasElement | null
  qrSvg: SVGSVGElement | null
  logoSrc: string
  shortUrl: string
}): Promise<DownloadResult> {
  const filename = `${fileBaseName(mesa)}.png`

  if (qrCanvas) {
    try {
      const card = await composeCard({ mesa, qrCanvas, logoSrc, shortUrl })
      if (card) {
        triggerDownload(card.toDataURL('image/png'), filename)
        return 'png'
      }
    } catch {
      // Canvas contaminado o sin soporte: se intenta el QR solo.
    }
    try {
      triggerDownload(qrCanvas.toDataURL('image/png'), filename)
      return 'png'
    } catch {
      // Último recurso: SVG.
    }
  }

  return downloadSvg(qrSvg, mesa) ? 'svg' : 'error'
}
