import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import logo from '../assets/logo-marlin-256.webp'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { EASE } from '../lib/motion'
import { safeGetItem, safeSetItem } from '../lib/storage'

const KEY = 'mariscos-carlos:intro-visto'

/**
 * Agua que sube dentro de las letras: dos olas (atrás y al frente) que se desplazan de lado
 * mientras el nivel sube. Todo con transform; dura lo mismo que la intro (~2 s) y luego se desmonta.
 * Las unidades px aquí son del marco normalizado de las letras (0 = tope de las letras, 100 = base).
 */
const WATER_CSS = `
@keyframes mc-water-rise {
  0% { transform: translateY(110px); animation-timing-function: cubic-bezier(0.35, 0.05, 0.6, 0.95) }
  72% { transform: translateY(32px); animation-timing-function: cubic-bezier(0.2, 0.55, 0.35, 1) }
  100% { transform: translateY(-10px) }
}
@keyframes mc-water-drift { from { transform: translateX(0) } to { transform: translateX(-25px) } }
.mc-water-rise { animation: mc-water-rise 1.6s linear 0.25s both }
.mc-water-front { animation: mc-water-drift 1.05s linear infinite }
.mc-water-back { animation: mc-water-drift 1.7s linear infinite reverse }
`

/** Ola senoidal de x = 0 a 150 (periodo 25, amplitud `amp`) rellena hacia abajo si `closed`. */
function wavePath(amp: number, phase: number, closed: boolean) {
  let d = `M0 ${phase ? amp : 0} `
  d += `Q6.25 ${phase ? amp * 3 : -amp * 2} 12.5 ${phase ? amp : 0} `
  for (let x = 25; x <= 150; x += 12.5) d += `T${x} ${phase ? amp : 0} `
  return closed ? `${d}L150 160 L0 160Z` : d
}

const FRONT_FILL = wavePath(6.5, 0, true)
const FRONT_CREST = wavePath(6.5, 0, false)
const BACK_FILL = wavePath(5, 1, true)

const FONT_SIZE = 100

/** Alto real de las letras (sin el interlineado de la fuente), medido con canvas. */
function glyphExtent(first: string, second: string): { top: number; bottom: number } | null {
  try {
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return null
    ctx.font = `400 ${FONT_SIZE}px Fraunces`
    const a = ctx.measureText(first)
    ctx.font = `italic 400 ${FONT_SIZE}px Fraunces`
    const b = ctx.measureText(second)
    const ascent = Math.max(a.actualBoundingBoxAscent, b.actualBoundingBoxAscent)
    const descent = Math.max(a.actualBoundingBoxDescent, b.actualBoundingBoxDescent)
    if (!(ascent > 0)) return null
    return { top: -ascent, bottom: descent }
  } catch {
    return null
  }
}

/** Nombre del restaurante en contorno, que se llena de agua azul con un borde de ola. */
function WaterName() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const textRef = useRef<SVGTextElement>(null)
  const [first, ...rest] = SITE.nombre.split(' ')
  const second = rest.join(' ')
  const [box, setBox] = useState({ x: 0, w: 690, top: -72, bottom: 2 })

  useLayoutEffect(() => {
    let alive = true
    const measure = () => {
      const el = textRef.current
      if (!alive || !el) return
      const b = el.getBBox()
      if (!(b.width > 0)) return
      const g = glyphExtent(first, second) ?? { top: b.y, bottom: b.y + b.height }
      setBox({ x: b.x, w: b.width, top: g.top, bottom: g.bottom })
    }
    measure()
    // Si Fraunces llega después, se vuelve a medir para que el agua quede dentro de las letras.
    const fonts = document.fonts
    if (fonts) {
      Promise.all([fonts.load(`400 ${FONT_SIZE}px Fraunces`), fonts.load(`italic 400 ${FONT_SIZE}px Fraunces`)])
        .then(measure)
        .catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [first, second])

  const h = box.bottom - box.top
  const padX = 4
  const padY = 10
  const viewBox = `${box.x - padX} ${box.top - padY} ${box.w + padX * 2} ${h + padY * 2}`
  const words = (
    <>
      {first} <tspan fontStyle="italic">{second}</tspan>
    </>
  )
  const textProps = { x: 0, y: 0, fontSize: FONT_SIZE, className: 'font-display', letterSpacing: -1 } as const

  return (
    <svg viewBox={viewBox} className="block h-auto w-[min(84vw,34rem)] overflow-visible" role="presentation">
      <style>{WATER_CSS}</style>
      <defs>
        <clipPath id={`${uid}-clip`}>
          <text {...textProps}>{words}</text>
        </clipPath>
        <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6CCBE6" />
          <stop offset="0.22" stopColor="#2E9BC0" />
          <stop offset="0.6" stopColor="#1C7C9C" />
          <stop offset="1" stopColor="#16657F" />
        </linearGradient>
      </defs>

      {/* Letras tenues: el vaso vacío */}
      <text ref={textRef} {...textProps} fill="rgb(251 246 236 / 0.06)">
        {words}
      </text>

      {/* Agua */}
      <g clipPath={`url(#${uid}-clip)`}>
        <g transform={`translate(${box.x} ${box.top}) scale(${box.w / 100} ${h / 100})`}>
          <g className="mc-water-rise">
            <g className="mc-water-back">
              <path d={BACK_FILL} fill="#4FB3D4" opacity="0.6" transform="translate(0 -8)" />
            </g>
            <g className="mc-water-front">
              <path d={FRONT_FILL} fill={`url(#${uid}-water)`} />
              <path d={FRONT_CREST} fill="none" stroke="#D6F2FA" strokeWidth="1.6" vectorEffect="non-scaling-stroke" opacity="0.85" />
            </g>
          </g>
        </g>
      </g>

      {/* Contorno encima, para que el borde de las letras siga nítido */}
      <text {...textProps} fill="none" stroke="rgb(251 246 236 / 0.6)" strokeWidth="1.3">
        {first} <tspan fontStyle="italic" stroke="rgb(242 177 52 / 0.85)">{second}</tspan>
      </text>
    </svg>
  )
}

/**
 * Entrada breve (una vez por sesión): el escudo del marlín aparece, el nombre se llena de agua
 * y una cortina sube para descubrir el video del hero. Se omite con movimiento reducido y en celular.
 */
export default function Preloader() {
  const { t } = useLang()
  const reduce = useReducedMotion() ?? false
  // En celular se omite: tapaba la página ~2 s y retrasaba lo primero que se ve (y el puntaje de velocidad).
  const [show, setShow] = useState(
    () => !reduce && !window.matchMedia('(max-width: 767px), (pointer: coarse)').matches && safeGetItem(KEY, 'session') !== '1',
  )

  useEffect(() => {
    if (!show) return
    safeSetItem(KEY, '1', 'session')
    const t = window.setTimeout(() => setShow(false), 2100)
    return () => window.clearTimeout(t)
  }, [show])

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="intro"
          aria-hidden="true"
          className="fixed inset-0 z-[90] grid place-items-center bg-night text-foam"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <div className="flex flex-col items-center px-4">
            <motion.img
              src={logo}
              alt=""
              width={128}
              height={128}
              className="size-28 md:size-32"
              initial={{ scale: 0.4, rotate: -40, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ duration: 1, ease: EASE }}
            />
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            >
              <WaterName />
            </motion.div>
            <motion.p
              className="mt-5 text-center text-[11px] font-semibold tracking-[0.3em] text-foam/70 uppercase sm:tracking-[0.4em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
            >
              {t('Los más frescos', 'The freshest')} · {t('desde', 'since')} {SITE.desde}
            </motion.p>
            <div className="mt-8 h-px w-48 overflow-hidden bg-white/15">
              <motion.div
                className="h-full bg-gold"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                style={{ originX: 0 }}
                transition={{ duration: 1.7, ease: EASE }}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
