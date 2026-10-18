import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import logo from '../../assets/logo-marlin-640.webp'
import { useLang } from '../../i18n/lang'
import { EASE } from '../../lib/motion'

/*
 * Sticker de vinil del marlín (inspirado en "Sticker Peel" de React Bits, sin WebGL).
 *
 * Capas, todas con transform/opacity:
 *  - Sombras (reposo y "en el aire") hechas con la silueta del escudo.
 *  - Frente: el escudo con borde blanco troquelado (filtro SVG que se calcula una vez) y brillo.
 *  - Solapa: la parte de atrás del sticker, reflejada sobre la línea de doblez, con su sombra.
 * El doblez se logra con una caja recortada (overflow: hidden) girada en diagonal que se desplaza
 * mientras su contenido se desplaza al revés: así crece la esquina despegada sin animar clip-path.
 */

/** Unidades del viewBox: la imagen mide 640 y se deja margen para el borde blanco. */
const VIEW_BOX = '-40 -40 720 720'
const ART = 640
const UNITS_PER_CQW = 7.2
/** Ángulo (grados) de la esquina que se despega: abajo a la derecha. */
const PEEL_ANGLE = 40
/** Borde del recorte en reposo, en % del sticker desde el centro (justo fuera de la silueta). */
const EDGE = 48
/** Cuánto se despega como máximo (al tocarlo), en % del sticker; el hover despega un poco menos. */
const DEPTH = 21
const HOVER_PEEL = 0.68
/** Inclinación del sticker ya pegado. */
const REST_TILT = -7

const PEEL_SPRING = { type: 'spring', stiffness: 320, damping: 26, mass: 0.8 } as const
const LIFT_SPRING = { type: 'spring', stiffness: 420, damping: 28 } as const

/** Umbral de alfa (tabla) para convertir el desenfoque en una silueta nítida y redondeada. */
const threshold = (steps: number) => `0 ${Array.from({ length: steps }, () => 1).join(' ')}`
const CUT = threshold(25)
const RIM = threshold(90)

type ArtVariant = 'front' | 'back' | 'shadow'

function useSvgIds() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return { filter: `mcs-f-${uid}`, mask: `mcs-m-${uid}`, grad: `mcs-g-${uid}` }
}

/** Primitivas del filtro que convierten el alfa del escudo en la silueta troquelada (blanca). */
function DieCutPrimitives({ result = 'cut' }: { result?: string }) {
  return (
    <>
      <feGaussianBlur in="SourceAlpha" stdDeviation="11" result="blur" />
      <feComponentTransfer in="blur" result="cutAlpha">
        <feFuncA type="table" tableValues={CUT} />
      </feComponentTransfer>
      <feFlood floodColor="#FFFFFF" result="white" />
      <feComposite in="white" in2="cutAlpha" operator="in" result={result} />
    </>
  )
}

function StickerArt({ variant, href, blur = 8 }: { variant: ArtVariant; href: string | undefined; blur?: number }) {
  const ids = useSvgIds()
  if (!href) return null

  if (variant === 'shadow') {
    return (
      <svg viewBox={VIEW_BOX} className="block size-full overflow-visible" aria-hidden="true" focusable="false">
        <defs>
          <filter id={ids.filter} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
            <DieCutPrimitives />
            <feFlood floodColor="#0A1B28" result="ink" />
            <feComposite in="ink" in2="cut" operator="in" result="silhouette" />
            <feGaussianBlur in="silhouette" stdDeviation={blur} />
          </filter>
        </defs>
        <image href={href} width={ART} height={ART} filter={`url(#${ids.filter})`} />
      </svg>
    )
  }

  if (variant === 'back') {
    // Degradado a lo largo de la diagonal que se despega: más oscuro en el doblez, claro en la punta.
    const rad = (PEEL_ANGLE * Math.PI) / 180
    const c = ART / 2
    const from = (EDGE - DEPTH) * UNITS_PER_CQW
    const to = 0.47 * 720
    return (
      <svg viewBox={VIEW_BOX} className="block size-full overflow-visible" aria-hidden="true" focusable="false">
        <defs>
          <filter id={ids.filter} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
            <DieCutPrimitives />
          </filter>
          <mask id={ids.mask} maskUnits="userSpaceOnUse" x="-40" y="-40" width="720" height="720" style={{ maskType: 'alpha' }}>
            <image href={href} width={ART} height={ART} filter={`url(#${ids.filter})`} />
          </mask>
          <linearGradient
            id={ids.grad}
            gradientUnits="userSpaceOnUse"
            x1={c + Math.cos(rad) * from}
            y1={c + Math.sin(rad) * from}
            x2={c + Math.cos(rad) * to}
            y2={c + Math.sin(rad) * to}
          >
            <stop offset="0" stopColor="#CFC6B6" />
            <stop offset="0.14" stopColor="#F6F2EA" />
            <stop offset="0.32" stopColor="#FFFFFF" />
            <stop offset="0.7" stopColor="#E9E3D8" />
            <stop offset="1" stopColor="#F8F5EF" />
          </linearGradient>
        </defs>
        <rect x="-40" y="-40" width="720" height="720" fill={`url(#${ids.grad})`} mask={`url(#${ids.mask})`} />
      </svg>
    )
  }

  return (
    <svg viewBox={VIEW_BOX} className="block size-full overflow-visible" aria-hidden="true" focusable="false">
      <defs>
        <filter id={ids.filter} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
          <DieCutPrimitives />
          {/* Filo apenas más grande en azul marino: separa el blanco del fondo claro */}
          <feComponentTransfer in="blur" result="rimAlpha">
            <feFuncA type="table" tableValues={RIM} />
          </feComponentTransfer>
          <feFlood floodColor="#13324A" floodOpacity="0.22" result="rimInk" />
          <feComposite in="rimInk" in2="rimAlpha" operator="in" result="rim" />
          <feMerge>
            <feMergeNode in="rim" />
            <feMergeNode in="cut" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Brillo del laminado: una franja diagonal y un reflejo más tenue */}
        <linearGradient id={ids.grad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.16" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.29" stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="0.38" stopColor="#FFFFFF" stopOpacity="0.06" />
          <stop offset="0.62" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.72" stopColor="#FFFFFF" stopOpacity="0.13" />
          <stop offset="0.78" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <mask id={ids.mask} maskUnits="userSpaceOnUse" x="0" y="0" width={ART} height={ART} style={{ maskType: 'alpha' }}>
          <image href={href} width={ART} height={ART} />
        </mask>
      </defs>
      <image href={href} width={ART} height={ART} filter={`url(#${ids.filter})`} />
      <rect width={ART} height={ART} fill={`url(#${ids.grad})`} mask={`url(#${ids.mask})`} />
    </svg>
  )
}

/** Caja del tamaño del sticker, colocada en el marco girado. */
const SQUARE: CSSProperties = { left: '25cqw', top: '25cqw', width: '100cqw', height: '100cqw' }
/** Caja de recorte: cubre todo el sticker girado y termina en la línea de doblez. */
const CLIP_BOX: CSSProperties = { left: '-25cqw', top: '-25cqw', width: `${75 + EDGE}cqw`, height: '150cqw' }
/** Devuelve el arte a su orientación normal dentro del marco girado. */
const UPRIGHT: CSSProperties = { transform: `rotate(${-PEEL_ANGLE}deg)` }

const GLOSS_MASK: CSSProperties = {
  WebkitMaskImage: `url(${logo})`,
  maskImage: `url(${logo})`,
  WebkitMaskSize: `${(ART / 720) * 100}%`,
  maskSize: `${(ART / 720) * 100}%`,
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
}

/**
 * Sticker del marlín. Ocupa un cuadro (usa el ancho que le dé `className`) y "cae" pegándose
 * cuando entra en pantalla.
 * - Con mouse (`draggable`): el hover despega la esquina y se puede arrastrar dentro de
 *   `constraintsRef`; se queda donde lo sueltes y aparece "Pégalo aquí" para regresarlo.
 * - Con touch: no se arrastra (no atrapa el scroll); tocarlo despega/pega la esquina.
 * - Teclado: es un botón; Enter/Espacio despega/pega la esquina.
 */
export default function MarlinSticker({
  className = '',
  constraintsRef,
  draggable = false,
  onActiveChange,
}: {
  className?: string
  constraintsRef?: RefObject<HTMLElement | null>
  draggable?: boolean
  /** Avisa cuando el sticker está despegado/arrastrándose (para acelerar el anillo, ocultar pistas…). */
  onActiveChange?: (active: boolean) => void
}) {
  const { t } = useLang()
  const reduce = useReducedMotion() ?? false
  const homeRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const draggedRef = useRef(false)
  const near = useInView(homeRef, { once: true, margin: '600px 0px 600px 0px' })
  const inView = useInView(homeRef, { once: true, amount: 0.5 })

  const [landed, setLanded] = useState(reduce)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [moved, setMoved] = useState(false)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const peel = useMotionValue(0)

  const href = near ? logo : undefined
  const peeled = pinned || hovered || dragging
  const airborne = dragging || !landed

  // Recorrido del doblez (en cqw: % del ancho del sticker).
  const clipT = useTransform(peel, (v) => `translateX(${-v * DEPTH}cqw)`)
  const counterT = useTransform(peel, (v) => `translateX(${v * DEPTH}cqw)`)
  const flapT = useTransform(peel, (v) => `translateX(${2 * EDGE - v * DEPTH}cqw) scaleX(-1)`)
  const flapShadowT = useTransform(peel, (v) => `translateX(${2 * EDGE - v * DEPTH - 3}cqw) scaleX(-1)`)
  const flapShadowOpacity = useTransform(peel, [0, 0.35, 1], [0, 0.3, 0.42])

  const peelTarget = pinned ? 1 : hovered || dragging ? HOVER_PEEL : 0

  useEffect(() => {
    const controls = animate(peel, peelTarget, reduce ? { duration: 0 } : PEEL_SPRING)
    return () => controls.stop()
  }, [peelTarget, reduce, peel])

  useEffect(() => {
    onActiveChange?.(peeled)
  }, [peeled, onActiveChange])

  // Si deja de poder arrastrarse (p. ej. se conecta una pantalla táctil), vuelve a su lugar.
  useEffect(() => {
    if (draggable) return
    x.set(0)
    y.set(0)
    setMoved(false)
  }, [draggable, x, y])

  const onPointerEnter = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') setHovered(true)
  }
  const onPointerLeave = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') setHovered(false)
  }

  const snapHome = () => {
    const transition = reduce ? { duration: 0 } : ({ type: 'spring', stiffness: 260, damping: 24 } as const)
    animate(x, 0, transition)
    animate(y, 0, transition)
    setMoved(false)
  }

  const goHome = () => {
    snapHome()
    buttonRef.current?.focus({ preventScroll: true })
  }

  const label = draggable
    ? t(
        'Sticker del marlín de Mariscos Carlos. Actívalo para despegar la esquina; con el mouse puedes arrastrarlo por el collage.',
        'Mariscos Carlos marlin sticker. Press to peel the corner; with a mouse you can drag it around the collage.',
      )
    : t('Sticker del marlín de Mariscos Carlos. Tócalo para despegar la esquina.', 'Mariscos Carlos marlin sticker. Tap to peel the corner.')

  return (
    <div ref={homeRef} className={`relative aspect-square ${className}`} style={{ containerType: 'inline-size' }}>
      {/* Lugar original: aparece cuando el sticker se movió */}
      {moved ? (
        <div className="absolute inset-[3%] grid place-items-center rounded-full border-2 border-dashed border-gold/45">
          <button
            type="button"
            onClick={goHome}
            className="rounded-full bg-gold px-3.5 py-1.5 font-banner text-[12px] font-semibold tracking-[0.14em] text-night uppercase shadow-[0_8px_18px_-8px_rgb(0_0_0/0.6)] transition-transform hover:scale-105"
          >
            {t('Pégalo aquí', 'Stick it back')}
          </button>
        </div>
      ) : null}

      <motion.div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ x, y }}
        drag={draggable}
        dragConstraints={constraintsRef}
        dragElastic={0.16}
        dragMomentum={false}
        onDragStart={() => {
          draggedRef.current = true
          setDragging(true)
        }}
        onDragEnd={() => {
          setDragging(false)
          // Soltado casi en su lugar: se acomoda solo; si no, se queda donde lo dejaron.
          if (Math.hypot(x.get(), y.get()) < 36) snapHome()
          else setMoved(true)
        }}
      >
        {/* Caída: se "pega" con un pequeño rebote al entrar en pantalla */}
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0, scale: 1.5, rotate: REST_TILT - 22, y: '-14%' }}
          animate={inView || reduce ? { opacity: 1, scale: 1, rotate: REST_TILT, y: '0%' } : undefined}
          transition={{ default: { type: 'spring', stiffness: 380, damping: 17, mass: 0.9, delay: 0.35 }, opacity: { duration: 0.2, delay: 0.35 } }}
          onAnimationComplete={() => setLanded(true)}
        >
          {/* Elevación mientras se arrastra */}
          <motion.div
            className="absolute inset-0"
            initial={false}
            animate={dragging ? { scale: 1.08, rotate: 4 } : { scale: 1, rotate: 0 }}
            transition={reduce ? { duration: 0 } : LIFT_SPRING}
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 block"
              initial={false}
              animate={{ opacity: airborne ? 0 : 0.5 }}
              transition={{ duration: reduce ? 0 : 0.25 }}
              style={{ translateY: '1.6cqw' }}
            >
              <StickerArt variant="shadow" href={href} blur={7} />
            </motion.span>
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 block"
              initial={false}
              animate={airborne ? { opacity: 0.5, x: '4%', y: '12%', scale: 1.04 } : { opacity: 0, x: '0%', y: '2%', scale: 1 }}
              transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE }}
            >
              <StickerArt variant="shadow" href={href} blur={22} />
            </motion.span>

            <button
              ref={buttonRef}
              type="button"
              aria-label={label}
              aria-pressed={pinned}
              onPointerDown={() => {
                draggedRef.current = false
              }}
              onPointerEnter={onPointerEnter}
              onPointerLeave={onPointerLeave}
              onClick={() => {
                if (draggedRef.current) {
                  draggedRef.current = false
                  return
                }
                setPinned((p) => !p)
              }}
              className={`pointer-events-auto absolute inset-0 block rounded-full ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              {/* Marco girado hacia la esquina que se despega */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 block" style={{ transform: `rotate(${PEEL_ANGLE}deg)` }}>
                {/* Frente recortado en el doblez */}
                <motion.span className="absolute block overflow-hidden" style={{ ...CLIP_BOX, transform: clipT }}>
                  <motion.span className="absolute block" style={{ ...SQUARE, transform: counterT }}>
                    <span className="absolute inset-0 block" style={UPRIGHT}>
                      <StickerArt variant="front" href={href} />
                      {href && !reduce ? (
                        <span className="absolute inset-0 block overflow-hidden" style={GLOSS_MASK}>
                          <span className="absolute inset-0 block rotate-[24deg]">
                            <motion.span
                              className="absolute -inset-y-1/4 left-0 block w-[38%] bg-linear-to-r from-white/0 via-white/45 to-white/0"
                              initial={false}
                              animate={peeled ? { x: '300%' } : { x: '-120%' }}
                              transition={peeled ? { duration: 1.1, ease: EASE } : { duration: 0 }}
                            />
                          </span>
                        </span>
                      ) : null}
                    </span>
                  </motion.span>
                </motion.span>

                {/* Solapa: la parte de atrás, reflejada sobre el doblez, con su sombra */}
                <motion.span className="absolute block overflow-hidden" style={{ ...CLIP_BOX, transform: clipT }}>
                  <motion.span className="absolute block" style={{ ...SQUARE, transform: flapShadowT, opacity: flapShadowOpacity }}>
                    <span className="absolute inset-0 block" style={UPRIGHT}>
                      <StickerArt variant="shadow" href={href} blur={10} />
                    </span>
                  </motion.span>
                  <motion.span className="absolute block" style={{ ...SQUARE, transform: flapT }}>
                    <span className="absolute inset-0 block" style={UPRIGHT}>
                      <StickerArt variant="back" href={href} />
                    </span>
                  </motion.span>
                </motion.span>
              </span>
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
