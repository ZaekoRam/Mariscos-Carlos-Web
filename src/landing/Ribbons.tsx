import { motion, useInView, useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import logo from '../assets/logo-marlin-256.webp'
import { useLang } from '../i18n/lang'

/** Copias de la frase por mitad del carril (cada mitad debe cubrir el listón completo). */
const COPIES = 3

function Ribbon({
  words,
  tone,
  reverse = false,
  running,
  animated,
  className,
}: {
  words: string[]
  tone: 'gold' | 'sunset'
  reverse?: boolean
  running: boolean
  animated: boolean
  className: string
}) {
  const gold = tone === 'gold'
  const half = (key: string) => (
    <div key={key} className="flex shrink-0 items-center">
      {Array.from({ length: COPIES }, (_, c) =>
        words.map((word, i) => (
          <span key={`${c}-${i}`} className="flex shrink-0 items-center">
            <span className="px-[0.55em]">{word}</span>
            <span className={`text-[0.7em] ${gold ? 'text-sunset-deep' : 'text-gold'}`}>✦</span>
          </span>
        )),
      )}
    </div>
  )

  return (
    <div className={`absolute top-1/2 left-1/2 w-[190%] -translate-x-1/2 -translate-y-1/2 sm:w-[150%] ${className}`}>
      <div
        className={`relative overflow-hidden py-2.5 shadow-[0_22px_36px_-22px_rgb(10_27_40/0.75)] sm:py-3.5 ${
          gold ? 'bg-gold text-deep' : 'bg-sunset-deep text-foam'
        }`}
      >
        {/* Costura punteada, como los listones impresos del menú */}
        <span className={`absolute inset-x-0 top-1 border-t border-dashed sm:top-1.5 ${gold ? 'border-deep/30' : 'border-foam/40'}`} />
        <span className={`absolute inset-x-0 bottom-1 border-t border-dashed sm:bottom-1.5 ${gold ? 'border-deep/30' : 'border-foam/40'}`} />
        <div
          className={`flex w-max font-banner text-[clamp(1.05rem,2.3vw,2.1rem)] leading-none font-semibold tracking-[0.06em] whitespace-nowrap uppercase ${
            animated ? 'animate-marquee' : ''
          }`}
          style={
            animated
              ? {
                  animationDuration: '48s',
                  animationDirection: reverse ? 'reverse' : 'normal',
                  animationPlayState: running ? 'running' : 'paused',
                }
              : undefined
          }
        >
          {half('a')}
          {half('b')}
        </div>
      </div>
    </div>
  )
}

/**
 * Separador alegre entre Reservar y la franja de MANZANILLO: dos listones que se cruzan
 * (dorado y atardecer) corriendo en sentidos opuestos, con el escudo del marlín en el cruce.
 * Arriba la arena (espuma) y abajo el mar de noche, que conecta con el video siguiente.
 * Las marquesinas son CSS y se pausan fuera de pantalla. Decorativo: aria-hidden.
 */
export default function Ribbons() {
  const { t } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  const inView = useInView(ref, { margin: '120px 0px 120px 0px' })
  const seen = useInView(ref, { once: true, amount: 0.35 })

  const phrase = t(
    'LOS MÁS FRESCOS ✦ DESDE 2004 ✦ MANZANILLO ✦ PIDE POR WHATSAPP ✦ RESERVA TU MESA ✦',
    'THE FRESHEST ✦ SINCE 2004 ✦ MANZANILLO ✦ ORDER ON WHATSAPP ✦ BOOK A TABLE ✦',
  )
  const words = phrase
    .split('✦')
    .map((w) => w.trim())
    .filter(Boolean)
  const reversedWords = [...words.slice(2), ...words.slice(0, 2)]

  return (
    <div ref={ref} aria-hidden="true" className="relative isolate h-[clamp(220px,25vw,360px)] overflow-hidden bg-foam">
      {/* Orilla: el mar de noche sube por abajo con una línea de espuma */}
      {/* 1px de sobra por abajo (lo recorta el overflow): sin línea clara de espuma al pegar con la franja del video */}
      <svg className="absolute inset-x-0 -bottom-px h-[calc(56%_+_1px)] w-full" viewBox="0 0 1440 240" preserveAspectRatio="none">
        <path d="M0 64C160 30 300 26 470 52S820 104 1000 70 1300 18 1440 44V240H0Z" fill="#16657F" opacity="0.9" transform="translate(0 -16)" />
        <path d="M0 64C160 30 300 26 470 52S820 104 1000 70 1300 18 1440 44V240H0Z" fill="#0A1B28" />
        <path d="M0 64C160 30 300 26 470 52S820 104 1000 70 1300 18 1440 44" fill="none" stroke="#FBF6EC" strokeOpacity="0.7" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>

      <Ribbon words={words} tone="gold" running={inView} animated={!reduce} className="-rotate-[7deg] sm:-rotate-[5deg]" />
      <Ribbon words={reversedWords} tone="sunset" reverse running={inView} animated={!reduce} className="rotate-[7deg] sm:rotate-[5deg]" />

      {/* Escudo del marlín sobre el cruce */}
      <div className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <motion.img
          src={logo}
          alt=""
          width={256}
          height={256}
          loading="lazy"
          decoding="async"
          className="size-[clamp(4.75rem,9vw,8rem)] drop-shadow-[0_14px_18px_rgb(10_27_40/0.45)]"
          initial={reduce ? false : { scale: 0.4, rotate: -50, opacity: 0 }}
          animate={reduce || seen ? { scale: 1, rotate: -8, opacity: 1 } : { scale: 0.4, rotate: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 15, mass: 0.9 }}
        />
      </div>
    </div>
  )
}
