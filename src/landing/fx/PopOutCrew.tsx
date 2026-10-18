import { useReducedMotion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'

/**
 * "Tripulación" que se asoma de un botón: camarón, pescadito, rodaja de limón y chile,
 * dibujados como caricatura (contorno azul marino grueso y colores planos, como el escudo del marlín).
 *
 * Uso: el botón/enlace padre debe tener las clases `relative group` (y no recortar con overflow);
 * coloca <PopOutCrew /> dentro. Aparecen con :hover (sólo en dispositivos con cursor) y
 * :focus-visible del padre, o cuando `active` es true (útil en celular).
 *
 * Rendimiento: sólo transform. Salen de detrás del borde superior del botón gracias a un
 * recorte fijo (clip-path) en la base; el vaivén es una animación CSS en pausa mientras no se ven.
 * Con movimiento reducido no se muestra nada.
 */

type CrewSize = 'sm' | 'md' | 'lg'

const NAVY = '#13324A'
/** "lg" se encoge un poco en celulares angostos para no tapar el título que va encima del botón. */
const SIZE: Record<CrewSize, string> = { sm: '40px', md: '54px', lg: 'clamp(54px, 14vw, 70px)' }

const CSS = `
.mc-crew{position:absolute;left:0;right:0;bottom:100%;height:calc(var(--s)*1.9);pointer-events:none;clip-path:inset(-40% -25% 0 -25%)}
.mc-crew__mate{position:absolute;bottom:0;left:calc(50% + var(--x)*var(--s) - var(--w)*var(--s)/2);width:calc(var(--w)*var(--s));height:var(--s);transform:translate3d(0,104%,0) rotate(0deg) scale(.7);transform-origin:50% 100%;transition:transform .28s cubic-bezier(.55,0,.75,.2);transition-delay:calc((3 - var(--i))*40ms)}
.mc-crew__sway{display:block;width:100%;height:100%;transform-origin:50% 100%;animation:mc-crew-sway var(--sd) ease-in-out infinite;animation-play-state:paused}
.mc-crew__sway>svg{display:block;width:100%;height:100%;overflow:visible}
.mc-crew[data-on] .mc-crew__mate,.group:focus-visible .mc-crew__mate,.group:has(:focus-visible) .mc-crew__mate{transform:var(--to);transition:transform .6s cubic-bezier(.34,1.56,.64,1);transition-delay:calc(var(--i)*60ms)}
.mc-crew[data-on] .mc-crew__sway,.group:focus-visible .mc-crew__sway,.group:has(:focus-visible) .mc-crew__sway{animation-play-state:running}
@media (hover:hover){
.group:hover .mc-crew__mate{transform:var(--to);transition:transform .6s cubic-bezier(.34,1.56,.64,1);transition-delay:calc(var(--i)*60ms)}
.group:hover .mc-crew__sway{animation-play-state:running}
}
@keyframes mc-crew-sway{0%,100%{transform:rotate(0deg)}25%{transform:rotate(var(--sa))}75%{transform:rotate(calc(var(--sa)*-1))}}
@media (prefers-reduced-motion:reduce){.mc-crew{display:none}}
`

/* ------------------------------------------------------------------------------------------ */
/* Personajes (viewBox 100×100, apoyados en el borde inferior)                                  */
/* Cada uno lleva un borde crema por fuera, como calcomanía (igual que el aro del escudo).       */
/* ------------------------------------------------------------------------------------------ */

const CREAM = '#FBF6EC'

/** Silueta en crema, más gruesa, debajo del dibujo. */
function Halo({ fills = [], lines = [] }: { fills?: string[]; lines?: string[] }) {
  return (
    <g fill={CREAM} stroke={CREAM} strokeWidth={11} strokeLinejoin="round" strokeLinecap="round">
      {fills.map((d) => (
        <path key={d} d={d} />
      ))}
      {lines.map((d) => (
        <path key={d} d={d} fill="none" strokeWidth={9} />
      ))}
    </g>
  )
}

const SHRIMP_BODY =
  'M85 35C85 22 71 14 56 16C34 18 16 34 16 56C16 76 32 90 54 88L60 86C65 80 62 74 56 74C42 76 32 66 34 54C36 44 46 40 56 42C64 44 70 50 77 48C83 46 85 41 85 35Z'
const SHRIMP_TAIL = 'M55 76C64 70 77 66 87 68C83 72 82 77 85 82C81 85 81 90 84 95C74 96 63 93 55 87Z'
const SHRIMP_ANTENNAE = ['M82 31C89 22 93 14 97 6', 'M77 27C81 16 79 9 72 4']

function Shrimp() {
  return (
    <svg viewBox="0 0 100 100">
      <Halo fills={[SHRIMP_BODY, SHRIMP_TAIL]} lines={SHRIMP_ANTENNAE} />
      <g fill="none" stroke={NAVY} strokeWidth={3} strokeLinecap="round">
        {SHRIMP_ANTENNAE.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="#F28A5E" stroke={NAVY} strokeWidth={4.5} strokeLinejoin="round">
        <path d={SHRIMP_BODY} />
        <path d={SHRIMP_TAIL} />
      </g>
      <g fill="none" stroke="#C4441E" strokeWidth={2.4} strokeLinecap="round">
        <path d="M62 80L78 72" />
        <path d="M62 83L79 89" />
      </g>
      <path d="M54 47C44 47 39 54 40 61C42 68 47 71 53 72" fill="none" stroke="#FBC6A4" strokeWidth={4} strokeLinecap="round" />
      <path d="M31 28C26 33 23 39 22 46" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.75} />
      <g fill="none" stroke={NAVY} strokeWidth={3} strokeLinecap="round">
        <path d="M41 19Q45 30 48 41" />
        <path d="M25 29Q33 37 39 45" />
        <path d="M17 49Q26 51 34 54" />
        <path d="M20 70Q28 66 36 63" />
        <path d="M33 84Q39 77 45 72" />
      </g>
      <g stroke={NAVY} strokeWidth={2.6} strokeLinecap="round">
        <path d="M37 59l6-1" />
        <path d="M40 66l5-3" />
        <path d="M47 71l3-5" />
        <path d="M62 50l2 6" />
        <path d="M69 51l1 6" />
      </g>
      <circle cx="69" cy="29" r="6.4" fill="#fff" stroke={NAVY} strokeWidth={3} />
      <circle cx="70.6" cy="29.8" r="3.4" fill={NAVY} />
      <circle cx="71.8" cy="28.2" r="1.2" fill="#fff" />
      <path d="M75 40q4 3 8-1" fill="none" stroke={NAVY} strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  )
}

const FISH_FIN = 'M38 38C42 24 54 18 64 21C61 27 60 32 61 37Z'
const FISH_TAIL = 'M30 57C22 48 14 41 6 39C10 48 10 53 13 57C10 61 10 67 6 76C14 73 22 66 30 57Z'
const FISH_BODY = 'M84 57C82 41 66 33 50 34C35 35 25 46 24 57C25 68 35 79 50 80C66 81 82 73 84 57Z'

function Fish() {
  return (
    <svg viewBox="0 0 100 100">
      <Halo fills={[FISH_FIN, FISH_TAIL, FISH_BODY]} />
      <g stroke={NAVY} strokeWidth={4.5} strokeLinejoin="round">
        <path d={FISH_FIN} fill="#F2B134" />
        <path d={FISH_TAIL} fill="#16657F" />
        <path d={FISH_BODY} fill="#1C7C9C" />
      </g>
      <path d="M31 65C42 74 60 77 77 67C68 76 55 80 45 78C38 76 34 71 31 65Z" fill="#9FD3DF" />
      <path d="M38 40C45 37 52 36 58 37" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <g fill="none" stroke="#0F4F66" strokeWidth={2.5} strokeLinecap="round">
        <path d="M38 48q3 3.5 6 0" />
        <path d="M46 45q3 3.5 6 0" />
        <path d="M42 55q3 3.5 6 0" />
        <path d="M50 52q3 3.5 6 0" />
      </g>
      <path d="M64 41C59 50 59 62 64 70" fill="none" stroke={NAVY} strokeWidth={3} strokeLinecap="round" />
      <path d="M53 60C46 61 42 67 45 72C50 70 54 66 57 62Z" fill="#F2B134" stroke={NAVY} strokeWidth={3.5} strokeLinejoin="round" />
      <circle cx="71" cy="50" r="7.6" fill="#fff" stroke={NAVY} strokeWidth={3} />
      <circle cx="73" cy="50.6" r="3.9" fill={NAVY} />
      <circle cx="74.4" cy="48.8" r="1.3" fill="#fff" />
      <path d="M83 61q-3 3-7 1" fill="none" stroke={NAVY} strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  )
}

const LIME_RIND = 'M51 13.2C73.5 13.2 91.5 32 91.5 55C91.5 77 72 95 49 95C27 95 9.5 76 9.5 53C9.5 31 28.5 13.2 51 13.2Z'
const LIME_SEPARATORS = [0, 45, 90, 135, 180, 225, 270, 315]

function LimeSlice() {
  return (
    <svg viewBox="0 0 100 100">
      <Halo fills={[LIME_RIND]} />
      <path d={LIME_RIND} fill="#4E9A2E" stroke={NAVY} strokeWidth={4.5} />
      <circle cx="50" cy="54" r="34.5" fill="#EEF5C8" />
      <circle cx="50" cy="54" r="30.5" fill="#A9D14A" />
      <g stroke="#EEF5C8" strokeWidth={3.4} strokeLinecap="round">
        {LIME_SEPARATORS.map((deg) => {
          const rad = (deg * Math.PI) / 180
          return <line key={deg} x1="50" y1="54" x2={50 + Math.cos(rad) * 29} y2={54 + Math.sin(rad) * 29} />
        })}
      </g>
      <circle cx="50" cy="54" r="4.6" fill="#EEF5C8" />
      <g fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" opacity={0.8}>
        <path d="M56 32q3 2 3.5 6" />
        <path d="M70 46q2.5 2 2 6" />
        <path d="M33 62q1 3 4 5" />
      </g>
      <path d="M14.3 41A38 38 0 0 1 31 21.1" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <path d="M86 66A38 38 0 0 1 74 84" fill="none" stroke="#2F6B1B" strokeWidth={3} strokeLinecap="round" />
    </svg>
  )
}

const CHILE_STEM = 'M44 22C41 13 45 6 54 4'
const CHILE_BODY = 'M30 26C44 17 59 25 61 39C63 54 71 71 86 91C67 89 46 75 36 59C28 47 22 33 30 26Z'
const CHILE_CAP = 'M25 28C29 19 45 15 55 22C50 28 39 31 25 28Z'

function Chile() {
  return (
    <svg viewBox="0 0 100 100">
      <Halo fills={[CHILE_BODY, CHILE_CAP]} />
      <path d={CHILE_STEM} fill="none" stroke={CREAM} strokeWidth={15} strokeLinecap="round" />
      <path d={CHILE_STEM} fill="none" stroke={NAVY} strokeWidth={9} strokeLinecap="round" />
      <path d={CHILE_STEM} fill="none" stroke="#4E9A2E" strokeWidth={4} strokeLinecap="round" />
      <path d={CHILE_BODY} fill="#D63A2A" stroke={NAVY} strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M57 43C59 57 66 71 79 86C66 77 58 63 54 49Z" fill="#A9391A" opacity={0.6} />
      <path d="M29 38C30 46 34 53 40 61" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" opacity={0.85} />
      <path d={CHILE_CAP} fill="#4E9A2E" stroke={NAVY} strokeWidth={4.5} strokeLinejoin="round" />
      <circle cx="40" cy="39" r="3" fill={NAVY} />
      <circle cx="50" cy="37" r="3" fill={NAVY} />
      <circle cx="40.9" cy="38" r="0.95" fill="#fff" />
      <circle cx="50.9" cy="36" r="0.95" fill="#fff" />
      <path d="M41 46q5 3.5 10-0.5" fill="none" stroke={NAVY} strokeWidth={2.6} strokeLinecap="round" />
    </svg>
  )
}

interface Mate {
  key: string
  /** Orden de aparición (izquierda → derecha). */
  i: number
  /** Desplazamiento del centro, en múltiplos del tamaño. */
  x: number
  /** Ancho relativo al tamaño. */
  w: number
  /** Pose final al asomarse. */
  to: string
  /** Vaivén: duración y amplitud. */
  sd: string
  sa: string
  art: ReactNode
}

// El orden en el arreglo es el orden de pintado (el último queda al frente).
const CREW: Mate[] = [
  { key: 'fish', i: 1, x: -0.44, w: 1.12, to: 'translate3d(0,-30%,0) rotate(-14deg) scale(1)', sd: '2.2s', sa: '6deg', art: <Fish /> },
  { key: 'chile', i: 3, x: 1.14, w: 0.92, to: 'translate3d(0,-14%,0) rotate(15deg) scale(1)', sd: '2.8s', sa: '5deg', art: <Chile /> },
  { key: 'shrimp', i: 0, x: -1.3, w: 1, to: 'translate3d(0,9%,0) rotate(-12deg) scale(1)', sd: '2.6s', sa: '4deg', art: <Shrimp /> },
  { key: 'lime', i: 2, x: 0.36, w: 0.86, to: 'translate3d(0,6%,0) rotate(10deg) scale(.94)', sd: '3s', sa: '3deg', art: <LimeSlice /> },
]

export default function PopOutCrew({ active = false, size = 'md' }: { active?: boolean; size?: CrewSize }) {
  const reduce = useReducedMotion() ?? false
  if (reduce) return null

  return (
    <>
      <style href="mc-popout-crew" precedence="default">
        {CSS}
      </style>
      <span aria-hidden="true" className="mc-crew" data-on={active ? '' : undefined} style={{ '--s': SIZE[size] } as CSSProperties}>
        {CREW.map((mate) => (
          <span
            key={mate.key}
            className="mc-crew__mate"
            style={{ '--i': mate.i, '--x': mate.x, '--w': mate.w, '--to': mate.to } as CSSProperties}
          >
            <span className="mc-crew__sway" style={{ '--sd': mate.sd, '--sa': mate.sa } as CSSProperties}>
              {mate.art}
            </span>
          </span>
        ))}
      </span>
    </>
  )
}
