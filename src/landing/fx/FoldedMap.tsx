import { motion, useInView, useReducedMotion } from 'motion/react'
import { useId, useRef, useState } from 'react'
import logo from '../../assets/logo-marlin-256.webp'
import { ExternalIcon } from '../../components/icons'
import { SITE } from '../../config/site'
import { useLang } from '../../i18n/lang'
import { EASE } from '../../lib/motion'

/*
 * Mapa de papel doblado (versión propia del "Animated Roadmap" de 21st.dev).
 * El plano se dibuja "extendido" (FLAT_W × FLAT_H) y cada pliegue lo proyecta con una
 * transformación afín, así el papel queda en acordeón sin CSS 3D. La ruta punteada se dibuja
 * una sola vez al entrar en pantalla y termina en el pin, que cae con rebote.
 * Es un mapa ILUSTRATIVO: no representa la geografía real.
 */

type Pt = readonly [number, number]

const FLAT_W = 720
const FLAT_H = 520
const PANELS = 4
const PANEL_W = FLAT_W / PANELS
const VIEW_W = 820
const VIEW_H = 650

/** Esquinas superiores de cada pliegue (zigzag) y vector "hacia abajo" del papel ya inclinado. */
const TOP: Pt[] = [
  [118, 40],
  [282, 100],
  [446, 74],
  [610, 134],
  [774, 106],
]
const DOWN: Pt = [-58, 470]

interface Affine {
  a: number
  b: number
  c: number
  d: number
  e: number
  f: number
}

const MATRICES: Affine[] = Array.from({ length: PANELS }, (_, i) => {
  const x0 = i * PANEL_W
  const [tlx, tly] = TOP[i]
  const [trx, trY] = TOP[i + 1]
  const a = (trx - tlx) / PANEL_W
  const b = (trY - tly) / PANEL_W
  return { a, b, c: DOWN[0] / FLAT_H, d: DOWN[1] / FLAT_H, e: tlx - a * x0, f: tly - b * x0 }
})

function panelOf(x: number) {
  return Math.min(PANELS - 1, Math.max(0, Math.floor(x / PANEL_W)))
}

/** Del plano extendido al papel doblado. */
function project([x, y]: Pt): Pt {
  const m = MATRICES[panelOf(x)]
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]
}

const add = (p: Pt, q: Pt): Pt => [p[0] + q[0], p[1] + q[1]]
const pts = (list: Pt[]) => list.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
const BOTTOM: Pt[] = TOP.map((p) => add(p, DOWN))
const OUTLINE: Pt[] = [...TOP, ...[...BOTTOM].reverse()]
const offset = (list: Pt[], dx: number, dy: number) => list.map((p) => add(p, [dx, dy]))

/* ---------------------------------------------------------------------------------------- */
/* Ruta: de la entrada de la central, rodeándola, hasta la esquina de atrás                  */
/* ---------------------------------------------------------------------------------------- */

const ROUTE_START: Pt = [345, 430]
const ROUTE_BEHIND: Pt = [345, 290]
const ROUTE_END: Pt = [485, 290]

function sampleRoute(): Pt[] {
  const r = 18
  const out: Pt[] = []
  const push = (p: Pt) => {
    const last = out[out.length - 1]
    if (last && Math.hypot(last[0] - p[0], last[1] - p[1]) < 0.01) return
    if (last && panelOf(last[0]) !== panelOf(p[0])) {
      // Punto exacto sobre el doblez para que la ruta "quiebre" justo en el pliegue.
      const fold = Math.max(panelOf(last[0]), panelOf(p[0])) * PANEL_W
      const t = (fold - last[0]) / (p[0] - last[0])
      out.push([fold, last[1] + (p[1] - last[1]) * t])
    }
    out.push(p)
  }
  const line = (from: Pt, to: Pt) => {
    const n = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 8))
    for (let k = 0; k <= n; k++) push([from[0] + ((to[0] - from[0]) * k) / n, from[1] + ((to[1] - from[1]) * k) / n])
  }
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let k = 0; k <= 8; k++) {
      const a = ((a0 + ((a1 - a0) * k) / 8) * Math.PI) / 180
      push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
  }
  line(ROUTE_START, [205 + r, 430])
  arc(205 + r, 430 - r, 90, 180)
  line([205, 430 - r], [205, 290 + r])
  arc(205 + r, 290 + r, 180, 270)
  line([205 + r, 290], ROUTE_END)
  return out
}

const ROUTE_FLAT = sampleRoute()
const ROUTE = ROUTE_FLAT.map(project)
const ROUTE_D = ROUTE.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

/** Fracción de la ruta (0–1) donde queda un punto del plano extendido. */
function routeFraction(target: Pt) {
  let total = 0
  let at = 0
  let best = Infinity
  for (let i = 0; i < ROUTE.length; i++) {
    if (i) total += Math.hypot(ROUTE[i][0] - ROUTE[i - 1][0], ROUTE[i][1] - ROUTE[i - 1][1])
    const dist = Math.hypot(ROUTE_FLAT[i][0] - target[0], ROUTE_FLAT[i][1] - target[1])
    if (dist < best) {
      best = dist
      at = total
    }
  }
  return total ? at / total : 0
}

const pct = (p: Pt) => ({ left: `${((p[0] / VIEW_W) * 100).toFixed(2)}%`, top: `${((p[1] / VIEW_H) * 100).toFixed(2)}%` })

const START = project(ROUTE_START)
const BEHIND = project(ROUTE_BEHIND)
const END = project(ROUTE_END)

/** Ancho del pin relativo al mapa (unidades de contenedor). */
const PIN_W = 'clamp(40px, 9.4cqw, 80px)'

/* Tiempos (segundos) de la animación de una sola vez. */
const T_ROUTE = 0.45
const D_ROUTE = 1.9
const T_BEHIND = T_ROUTE + routeFraction(ROUTE_BEHIND) * D_ROUTE
const T_PIN = T_ROUTE + D_ROUTE - 0.25
const T_DEST = T_PIN + 0.55

/* ---------------------------------------------------------------------------------------- */
/* Contenido del plano extendido                                                              */
/* ---------------------------------------------------------------------------------------- */

const PAPER = '#F4E9D8'
const BLOCK = '#E8D7BA'
const BLOCK_ALT = '#E3D0AF'
const STREET = '#FFFDF8'
const VX = [205, 345, 485, 625]
const HY = [40, 165, 290, 430]
const AVENUE = 430
const COLS: Pt[] = [
  [100, 205],
  [205, 345],
  [345, 485],
  [485, 625],
  [625, 740],
]
const ROWS: Pt[] = [
  [-20, 40],
  [40, 165],
  [165, 290],
  [290, 430],
  [430, 540],
]
const COAST = 'M118 -10 C96 60 142 128 112 200 S62 318 94 390 S56 492 72 530'
const SEA = `${COAST} L-10 530 L-10 -10 Z`
const WAVES: Pt[] = [
  [18, 36],
  [52, 96],
  [16, 150],
  [60, 214],
  [22, 268],
  [44, 330],
  [12, 392],
  [30, 452],
  [8, 500],
]

function halfWidth(y: number) {
  return y === AVENUE ? 14 : 7
}

function FlatMap({ uid, seaLabel }: { uid: string; seaLabel: string }) {
  const blocks: { x: number; y: number; w: number; h: number; key: string; alt: boolean }[] = []
  COLS.forEach(([x0, x1], ci) => {
    ROWS.forEach(([y0, y1], ri) => {
      // La central ocupa dos manzanas; la plaza y el restaurante se dibujan aparte.
      if (ri === 3 && (ci === 1 || ci === 2)) return
      if (ri === 2 && ci === 3) return
      const left = x0 + (ci === 0 ? 0 : 7) + 5
      const right = x1 - (ci === COLS.length - 1 ? 0 : 7) - 5
      const top = y0 + (ri === 0 ? 0 : halfWidth(y0)) + 5
      const bottom = y1 - (ri === ROWS.length - 1 ? 0 : halfWidth(y1)) - 5
      blocks.push({ x: left, y: top, w: right - left, h: bottom - top, key: `${ci}-${ri}`, alt: (ci + ri) % 3 === 0 })
    })
  })

  return (
    <g id={`${uid}-flat`}>
      <rect x={-10} y={-10} width={FLAT_W + 20} height={FLAT_H + 20} fill={PAPER} />

      {/* Manzanas con lotes */}
      {blocks.map((b) => (
        <g key={b.key}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={5} fill={b.alt ? BLOCK_ALT : BLOCK} />
          {b.w > b.h ? (
            <path d={`M${b.x + b.w / 2} ${b.y + 4}V${b.y + b.h - 4}M${b.x + 4} ${b.y + b.h / 2}H${b.x + b.w / 2}`} stroke={PAPER} strokeWidth={1.6} opacity={0.75} />
          ) : (
            <path d={`M${b.x + 4} ${b.y + b.h / 2}H${b.x + b.w - 4}`} stroke={PAPER} strokeWidth={1.6} opacity={0.75} />
          )}
        </g>
      ))}

      {/* Calles */}
      {HY.map((y) => (
        <rect key={`h${y}`} x={60} y={y - halfWidth(y)} width={FLAT_W} height={halfWidth(y) * 2} fill={STREET} />
      ))}
      {VX.map((x) =>
        x === 345 ? (
          <g key={`v${x}`}>
            <rect x={x - 7} y={-10} width={14} height={300} fill={STREET} />
            <rect x={x - 7} y={AVENUE} width={14} height={110} fill={STREET} />
          </g>
        ) : (
          <rect key={`v${x}`} x={x - 7} y={-10} width={14} height={FLAT_H + 20} fill={STREET} />
        ),
      )}
      {/* Bulevar: orillas doradas y línea central */}
      <path d={`M150 ${AVENUE - 14}H730M150 ${AVENUE + 14}H730`} stroke="#F1D6A3" strokeWidth={2} />
      <path d={`M150 ${AVENUE}H730`} stroke="#E7D6B8" strokeWidth={1.6} />

      {/* Central de Autobuses */}
      <rect x={217} y={302} width={256} height={109} rx={6} fill="#D5E1DF" />
      <rect x={232} y={313} width={226} height={44} rx={4} fill="#16657F" />
      <path d="M232 322H458M232 348H458" stroke="#1C7C9C" strokeWidth={2} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <g key={i} transform={`translate(${236 + i * 31} 368)`}>
          <path d="M0 0V36" stroke="#FFFFFF" strokeWidth={1.6} />
          {i < 7 ? (
            <g transform="translate(7 5)">
              <rect width={17} height={27} rx={3} fill={i % 3 === 1 ? '#F2B134' : '#FBF6EC'} stroke="#13324A" strokeOpacity={0.25} />
              <rect x={3} y={3} width={11} height={6} rx={1} fill="#13324A" opacity={0.55} />
            </g>
          ) : null}
        </g>
      ))}

      {/* Plaza */}
      <rect x={497} y={177} width={116} height={101} rx={8} fill="#D3DDC4" />
      <path d="M497 227H613M555 177V278" stroke="#FFFDF8" strokeWidth={3} opacity={0.8} />
      <circle cx={555} cy={227} r={15} fill="#D3DDC4" stroke="#FFFDF8" strokeWidth={4} />
      <circle cx={555} cy={227} r={6} fill="#9CC3CF" />
      {[
        [514, 194],
        [596, 194],
        [514, 261],
        [596, 261],
        [536, 208],
        [576, 248],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={7} fill="#A9BE95" />
      ))}

      {/* Mar */}
      <path d={COAST} fill="none" stroke="#F1D6A3" strokeWidth={26} />
      <path d={SEA} fill="#2A8AA8" />
      <path d={SEA} fill="#1C7C9C" transform="translate(-14 0)" />
      {WAVES.map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y}q5 -5 10 0t10 0`} fill="none" stroke="#FBF6EC" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      ))}
      {/* Panga */}
      <g transform="translate(40 180) rotate(-8)">
        <path d="M0 0h22l-4 6H4Z" fill="#F2B134" />
        <path d="M10 -1V-14L18 -2Z" fill="#FBF6EC" />
      </g>
      <text
        x={0}
        y={0}
        transform="translate(52 330) rotate(-82)"
        className="font-display italic"
        fontSize={15}
        fill="#FBF6EC"
        opacity={0.85}
        letterSpacing={1}
      >
        {seaLabel}
      </text>
      {/* Bulevar costero */}
      <path d={COAST} fill="none" stroke={STREET} strokeWidth={12} transform="translate(34 0)" />

      {/* Rosa de los vientos */}
      <g transform="translate(44 470)">
        <circle r={17} fill="none" stroke="#FBF6EC" strokeWidth={1.2} opacity={0.7} />
        <path d="M0 -13L4 0L0 13L-4 0Z" fill="#FBF6EC" opacity={0.9} />
        <path d="M0 -13L4 0H-4Z" fill="#E8552B" />
        <text y={-21} textAnchor="middle" className="font-banner" fontSize={10} fill="#FBF6EC">
          N
        </text>
      </g>

      {/* Cartela */}
      <g transform="translate(588 486)">
        <rect width={120} height={24} rx={3} fill="#FFFDF8" stroke="#13324A" strokeOpacity={0.3} />
        <text x={60} y={16} textAnchor="middle" className="font-banner" fontSize={10.5} letterSpacing={1.6} fill="#13324A">
          MANZANILLO · COL.
        </text>
      </g>

      {/* Marco impreso */}
      <rect x={8} y={8} width={FLAT_W - 16} height={FLAT_H - 16} fill="none" stroke="#13324A" strokeOpacity={0.28} strokeWidth={1.2} />
      <rect x={13} y={13} width={FLAT_W - 26} height={FLAT_H - 26} fill="none" stroke="#13324A" strokeOpacity={0.12} />
    </g>
  )
}

/* ---------------------------------------------------------------------------------------- */
/* Piezas animadas                                                                            */
/* ---------------------------------------------------------------------------------------- */

function Pill({
  at,
  place,
  n,
  label,
  delay,
  play,
  reduce,
  tone = 'light',
  align = 50,
}: {
  at: Pt
  place: 'below' | 'above'
  /** Punto de la píldora (en % de su ancho) que queda sobre el ancla. */
  align?: number
  n: number
  label: string
  delay: number
  play: boolean
  reduce: boolean
  tone?: 'light' | 'accent'
}) {
  const below = place === 'below'
  const accent = tone === 'accent'
  return (
    <div className="pointer-events-none absolute" style={pct(at)}>
      <div
        className="absolute left-0"
        style={{ transform: `translateX(-${align}%)`, ...(below ? { top: 'clamp(9px, 1.9cqw, 15px)' } : { bottom: `calc(${PIN_W} * 1.3125 + 9px)` }) }}
      >
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.6, y: below ? -6 : 6 }}
          animate={play ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.6, y: below ? -6 : 6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22, delay }}
          style={{ transformOrigin: below ? `${align}% 0%` : `${align}% 100%` }}
          className={`relative inline-flex items-center gap-[clamp(5px,1cqw,8px)] rounded-full py-[clamp(3px,0.5cqw,4px)] pr-[clamp(9px,1.8cqw,14px)] pl-[clamp(3px,0.5cqw,4px)] whitespace-nowrap shadow-[0_10px_24px_-8px_rgb(10_27_40/0.55)] ${
            accent ? 'bg-sunset-deep text-white' : 'bg-white text-deep'
          }`}
        >
          <span
            className={`absolute size-2 -translate-x-1/2 rotate-45 ${below ? '-top-1' : '-bottom-1'} ${accent ? 'bg-sunset-deep' : 'bg-white'}`}
            style={{ left: `${align}%` }}
          />
          <span
            className={`relative grid size-[clamp(18px,3cqw,24px)] place-items-center rounded-full font-banner text-[clamp(10px,1.5cqw,12px)] font-semibold ${
              accent ? 'bg-gold text-night' : 'bg-ocean-deep text-white'
            }`}
          >
            {n}
          </span>
          <span className="relative font-banner text-[clamp(10.5px,1.65cqw,13.5px)] font-medium tracking-[0.08em] uppercase">{label}</span>
        </motion.div>
      </div>
    </div>
  )
}

function Pin({ play, reduce }: { play: boolean; reduce: boolean }) {
  return (
    <div className="pointer-events-none absolute" style={pct(END)}>
      {/* Sombra y onda al caer */}
      <motion.span
        className="absolute top-0 left-0 block h-[clamp(9px,1.5cqw,12px)] w-[clamp(32px,5.8cqw,48px)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-night/45"
        initial={reduce ? false : { opacity: 0, scale: 0.2 }}
        animate={play ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.2 }}
        transition={{ duration: 0.35, ease: EASE, delay: T_PIN + 0.12 }}
      />
      {reduce ? null : (
        <motion.span
          className="absolute top-0 left-0 block h-[clamp(16px,3cqw,24px)] w-[clamp(48px,10cqw,80px)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-sunset"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={play ? { opacity: [0, 0.9, 0], scale: [0.3, 1, 1.9] } : { opacity: 0, scale: 0.3 }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: T_PIN + 0.22, times: [0, 0.2, 1] }}
        />
      )}
      <div className="absolute bottom-0 left-0 -translate-x-1/2" style={{ width: PIN_W }}>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: '-140%' }}
          animate={play ? { opacity: 1, y: '0%' } : { opacity: 0, y: '-140%' }}
          transition={{
            y: { type: 'spring', stiffness: 520, damping: 15, mass: 0.9, delay: T_PIN },
            opacity: { duration: 0.15, delay: T_PIN },
          }}
          style={{ transformOrigin: '50% 100%' }}
          className="relative aspect-[64/84] w-full drop-shadow-[0_8px_10px_rgb(10_27_40/0.35)]"
        >
          <svg viewBox="0 0 64 84" className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
            <path
              d="M32 2C15.4 2 2 15.3 2 31.7c0 21.3 26.1 47.6 28.1 49.6a2.7 2.7 0 0 0 3.8 0C35.9 79.3 62 53 62 31.7 62 15.3 48.6 2 32 2Z"
              fill="#E8552B"
              stroke="#A9391A"
              strokeWidth={2}
            />
            <path d="M12 22c3-8 10-13 18-14" fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />
            <circle cx={32} cy={31} r={22} fill="#FFFFFF" />
          </svg>
          <img
            src={logo}
            alt=""
            width={256}
            height={256}
            loading="lazy"
            decoding="async"
            className="absolute top-[13.5%] left-[18%] aspect-square w-[64%] object-contain"
          />
        </motion.div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------------------- */
/* Componente                                                                                 */
/* ---------------------------------------------------------------------------------------- */

/**
 * Mapa ilustrativo doblado que enlaza a Google Maps (pestaña nueva).
 * Escritorio y móvil: misma composición escalada; con movimiento reducido aparece completo y quieto.
 */
export default function FoldedMap({ className = '' }: { className?: string }) {
  const { t } = useLang()
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLAnchorElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.45 })
  const play = reduce || inView
  // Mientras la ruta se dibuja va en su propia capa, así no se repinta el papel de abajo.
  const [routeDone, setRouteDone] = useState(false)
  const drawing = play && !reduce && !routeDone
  const uid = `fm${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <a
      ref={ref}
      href={SITE.mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-folded-map=""
      aria-label={t(
        'Mapa ilustrativo: de la Central de Autobuses a Mariscos Carlos, justo detrás. Abrir la ubicación en Google Maps (pestaña nueva)',
        'Illustrative map: from the bus station to Mariscos Carlos, right behind it. Open the location in Google Maps (new tab)',
      )}
      className={`group relative block rounded-[1.75rem] ${className}`}
    >
      <motion.div
        className="@container relative aspect-[820/650] w-full"
        initial={reduce ? false : { opacity: 0, y: 28, rotate: -2.5, scale: 0.96 }}
        animate={play ? { opacity: 1, y: 0, rotate: 0, scale: 1 } : { opacity: 0, y: 28, rotate: -2.5, scale: 0.96 }}
        transition={{ duration: 1.1, ease: EASE }}
      >
        <div className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1.5 group-hover:-rotate-[0.6deg]">
          {/* Papel doblado (estático: se pinta una sola vez) */}
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true" focusable="false">
            <defs>
              <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="150%">
                <feGaussianBlur stdDeviation={16} />
              </filter>
              <filter id={`${uid}-contact`} x="-10%" y="-10%" width="120%" height="130%">
                <feGaussianBlur stdDeviation={4} />
              </filter>
              <linearGradient id={`${uid}-lit`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.26} />
                <stop offset="1" stopColor="#FFFFFF" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`${uid}-shade`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#13324A" stopOpacity={0.2} />
                <stop offset="0.55" stopColor="#13324A" stopOpacity={0.1} />
                <stop offset="1" stopColor="#13324A" stopOpacity={0.04} />
              </linearGradient>
              {Array.from({ length: PANELS }, (_, i) => (
                <clipPath key={i} id={`${uid}-p${i}`}>
                  <rect x={i * PANEL_W} y={0} width={PANEL_W} height={FLAT_H} />
                </clipPath>
              ))}
              <FlatMap uid={uid} seaLabel={t('Océano Pacífico', 'Pacific Ocean')} />
            </defs>

            {/* Sombra difusa y de contacto */}
            <polygon points={pts(offset(OUTLINE, 18, 30))} fill="#000000" opacity={0.55} filter={`url(#${uid}-soft)`} />
            <polygon points={pts(offset(OUTLINE, 4, 10))} fill="#000000" opacity={0.35} filter={`url(#${uid}-contact)`} />

            {/* Grosor del papel */}
            {Array.from({ length: PANELS }, (_, i) => (
              <polygon
                key={`edge${i}`}
                points={pts([BOTTOM[i], BOTTOM[i + 1], add(BOTTOM[i + 1], [0, 7]), add(BOTTOM[i], [0, 7])])}
                fill={i % 2 ? '#C7AE84' : '#D9C29A'}
              />
            ))}
            <polygon points={pts([TOP[PANELS], BOTTOM[PANELS], add(BOTTOM[PANELS], [0, 7]), add(TOP[PANELS], [0, 7])])} fill="#C7AE84" />

            {/* Pliegues: el mismo plano recortado y proyectado en cada panel */}
            {MATRICES.map((m, i) => (
              <g key={`panel${i}`} transform={`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`}>
                <g clipPath={`url(#${uid}-p${i})`}>
                  <use href={`#${uid}-flat`} />
                </g>
              </g>
            ))}

            {/* Luz y sombra de cada pliegue */}
            {Array.from({ length: PANELS }, (_, i) => (
              <polygon
                key={`shade${i}`}
                points={pts([TOP[i], TOP[i + 1], BOTTOM[i + 1], BOTTOM[i]])}
                fill={`url(#${uid}-${i % 2 ? 'shade' : 'lit'})`}
              />
            ))}
            {[1, 2, 3].map((k) => (
              <g key={`crease${k}`}>
                <line x1={TOP[k][0]} y1={TOP[k][1]} x2={BOTTOM[k][0]} y2={BOTTOM[k][1]} stroke={k % 2 ? '#13324A' : '#FFFFFF'} strokeOpacity={k % 2 ? 0.16 : 0.7} strokeWidth={1.4} />
                <line x1={TOP[k][0] + 1.5} y1={TOP[k][1]} x2={BOTTOM[k][0] + 1.5} y2={BOTTOM[k][1]} stroke={k % 2 ? '#FFFFFF' : '#13324A'} strokeOpacity={k % 2 ? 0.35 : 0.1} strokeWidth={1} />
              </g>
            ))}
            <polyline points={pts(TOP)} fill="none" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.6} strokeLinejoin="round" />
          </svg>

          {/* Ruta (capa aparte: sólo esto se repinta mientras se dibuja) */}
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className={`absolute inset-0 h-full w-full overflow-visible ${drawing ? 'will-change-transform' : ''}`}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <mask id={`${uid}-route`} maskUnits="userSpaceOnUse" x={0} y={0} width={VIEW_W} height={VIEW_H}>
                <motion.path
                  d={ROUTE_D}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth={16}
                  strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                  animate={play ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                  transition={{
                    pathLength: { duration: D_ROUTE, ease: [0.45, 0.05, 0.55, 0.95], delay: T_ROUTE },
                    opacity: { duration: 0.01, delay: T_ROUTE },
                  }}
                  onAnimationComplete={() => {
                    if (play) setRouteDone(true)
                  }}
                />
              </mask>
            </defs>
            <g mask={`url(#${uid}-route)`}>
              <path d={ROUTE_D} fill="none" stroke="#C4441E" strokeOpacity={0.25} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
              <path d={ROUTE_D} fill="none" stroke="#E8552B" strokeWidth={5} strokeDasharray="11 8" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* Puntos de la ruta */}
            {[
              { p: START, d: 0.2 },
              { p: BEHIND, d: T_BEHIND },
            ].map(({ p, d }) => (
              <motion.circle
                key={`${p[0]}`}
                cx={p[0]}
                cy={p[1]}
                r={8}
                fill="#FFFFFF"
                stroke="#C4441E"
                strokeWidth={4}
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                animate={play ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, delay: d }}
              />
            ))}
          </svg>

          <Pill at={START} place="below" n={1} label={t('Central de Autobuses', 'Bus station')} delay={0.3} play={play} reduce={reduce} />
          <Pill at={BEHIND} place="below" n={2} label={t('Detrás de la central', 'Behind the station')} delay={T_BEHIND + 0.05} play={play} reduce={reduce} align={70} />
          <Pin play={play} reduce={reduce} />
          <Pill at={END} place="above" n={3} label="Mariscos Carlos" delay={T_DEST} play={play} reduce={reduce} tone="accent" />
        </div>
      </motion.div>

      <span className="relative mt-3 ml-5 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-deep shadow-[0_8px_20px_-10px_rgb(10_27_40/0.6)] sm:absolute sm:bottom-[3%] sm:left-[2%] sm:mt-0 sm:ml-0 sm:px-3 sm:py-1.5 sm:text-xs">
        {t('Mapa ilustrativo · Ver en Google Maps', 'Illustrative map · Open in Google Maps')}
        <ExternalIcon className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>
    </a>
  )
}
