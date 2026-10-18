import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EASE } from '../lib/motion'
import { photo, photoSrcSet, PHOTO_ALT, type PhotoKey, type VideoAsset } from './media'

/* ------------------------------------------------------------------------------------------ */
/* Video de fondo                                                                               */
/* ------------------------------------------------------------------------------------------ */

const SMALL_SCREEN = '(max-width: 767px)'

/** Resuelve cuando la página terminó de cargar y el navegador está libre (para no competir con lo primero que se ve). */
function afterLoadIdle(cb: () => void): () => void {
  let cancelled = false
  let idle = 0
  let timer = 0
  const run = () => {
    timer = window.setTimeout(() => {
      if (cancelled) return
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => !cancelled && cb(), { timeout: 2000 })
      else cb()
    }, 600)
  }
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
  return () => {
    cancelled = true
    window.removeEventListener('load', run)
    window.clearTimeout(timer)
    if (idle) window.cancelIdleCallback(idle)
  }
}

/**
 * Video decorativo a pantalla completa (object-cover).
 * - Sólo se reproduce cuando está a la vista (ahorra batería y datos).
 * - Con `eager` (hero) carga de inmediato en escritorio; en celular usa la versión ligera y
 *   espera a que la página termine de cargar, así el póster se pinta primero.
 * - Con ahorro de datos o movimiento reducido no se reproduce: queda el póster fijo.
 */
export function BgVideo({
  video,
  eager = false,
  className = '',
  style,
}: {
  video: VideoAsset
  eager?: boolean
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotion() ?? false
  const [small] = useState(() => typeof window !== 'undefined' && window.matchMedia(SMALL_SCREEN).matches)
  const [saveData] = useState(
    () => typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData),
  )
  const near = useInView(ref, { margin: '600px 0px 600px 0px' })
  const visible = useInView(ref, { margin: '0px 0px 0px 0px' })
  const [load, setLoad] = useState(eager && !small && !saveData)
  const [pageReady, setPageReady] = useState(!small)

  useEffect(() => {
    if (pageReady) return
    return afterLoadIdle(() => setPageReady(true))
  }, [pageReady])

  useEffect(() => {
    if (saveData || !pageReady) return
    if (near || (eager && small)) setLoad(true)
  }, [near, eager, small, saveData, pageReady])

  useEffect(() => {
    const el = ref.current
    if (!el || !load) return
    if (visible && !reduce) {
      el.play().catch(() => {
        // Autoplay bloqueado (modo ahorro de datos): se queda el póster.
      })
    } else {
      el.pause()
    }
  }, [visible, reduce, load])

  const src = small && video.srcSmall ? video.srcSmall : video.src
  const poster = small && video.posterSmall ? video.posterSmall : video.poster

  return (
    <video
      ref={ref}
      className={`h-full w-full object-cover ${className}`}
      style={style}
      // El póster también espera a que el video se acerque (el navegador no lo carga en diferido solo).
      poster={eager || near || load ? poster : undefined}
      muted
      loop
      playsInline
      autoPlay={load && !reduce}
      preload={load ? 'metadata' : 'none'}
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    >
      {load ? <source src={src} type="video/mp4" /> : null}
    </video>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Imagen con parallax interno                                                                 */
/* ------------------------------------------------------------------------------------------ */

/**
 * Foto dentro de un marco que se desplaza más lento que la página (parallax).
 * `strength` es el recorrido en % del alto del marco.
 */
export function ParallaxPhoto({
  name,
  ...rest
}: {
  name: PhotoKey
  className?: string
  imgClassName?: string
  strength?: number
  sizes?: string
  priority?: boolean
  caption?: string
}) {
  return <ParallaxImg src={photo(name, 1200)} srcSet={photoSrcSet(name)} alt={PHOTO_ALT[name]} {...rest} />
}

/** Igual que ParallaxPhoto pero con cualquier imagen (fotos reales del restaurante). */
export function ParallaxImg({
  src,
  srcSet,
  alt,
  className = '',
  imgClassName = '',
  strength = 12,
  sizes = '(min-width: 1024px) 40vw, 90vw',
  priority = false,
  caption,
}: {
  src: string
  srcSet?: string
  alt: string
  className?: string
  imgClassName?: string
  strength?: number
  sizes?: string
  priority?: boolean
  caption?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`])

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={reduce ? undefined : { y, scale: 1 + (strength * 2.4) / 100 }}
        className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
      />
      {caption ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-night/60 px-2.5 py-1 text-[10px] font-medium tracking-wide text-foam backdrop-blur-sm">
          {caption}
        </span>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Texto                                                                                        */
/* ------------------------------------------------------------------------------------------ */

/** Antetítulo pequeño en versalitas con una línea. */
export function Eyebrow({ children, tone = 'dark', className = '' }: { children: ReactNode; tone?: 'dark' | 'light'; className?: string }) {
  return (
    <p
      className={`inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.28em] uppercase ${
        tone === 'light' ? 'text-gold' : 'text-ocean-deep'
      } ${className}`}
    >
      <span aria-hidden="true" className={`h-px w-8 ${tone === 'light' ? 'bg-gold/70' : 'bg-ocean-deep/60'}`} />
      {children}
    </p>
  )
}

/**
 * Divide un texto en líneas ("\n") y palabras; lo que va entre *asteriscos* (aunque abarque
 * varias palabras) se marca como acento.
 */
function parseAccents(text: string): { word: string; accent: boolean }[][] {
  let inAccent = false
  return text.split('\n').map((line) =>
    line
      .split(' ')
      .filter(Boolean)
      .map((raw) => {
        if (raw.startsWith('*')) inAccent = true
        const accent = inAccent
        if (raw.endsWith('*')) inAccent = false
        return { word: raw.replace(/\*/g, ''), accent }
      }),
  )
}

/**
 * Título que aparece palabra por palabra desde abajo, recortado por una máscara.
 * `text` admite saltos de línea con "\n"; las palabras entre *asteriscos* van en itálica de acento.
 */
export function RevealTitle({
  text,
  as: Tag = 'h2',
  id,
  className = '',
  accentClassName = 'italic text-sunset-deep',
  delay = 0,
  once = true,
  instant = false,
}: {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p'
  id?: string
  className?: string
  accentClassName?: string
  delay?: number
  once?: boolean
  /** Sin animación de entrada: visible desde el primer pintado (título del hero en celular). */
  instant?: boolean
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once, amount: 0.4 })
  const lines = parseAccents(text)
  let wordIndex = 0
  const plain = text.replace(/\*/g, '').replace(/\n/g, ' ')

  return (
    <Tag ref={ref} id={id} className={className} aria-label={plain}>
      {lines.map((line, li) => (
        <span key={li} aria-hidden="true" className="block">
          {line.map(({ word, accent }, wi) => {
            const i = wordIndex++
            return (
              <span key={wi} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                <motion.span
                  className={`inline-block ${accent ? accentClassName : ''}`}
                  initial={instant ? false : { y: '110%', rotate: 4 }}
                  animate={instant || inView ? { y: '0%', rotate: 0 } : { y: '110%', rotate: 4 }}
                  transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.06 }}
                >
                  {word}
                </motion.span>
                {wi < line.length - 1 ? ' ' : null}
              </span>
            )
          })}
        </span>
      ))}
    </Tag>
  )
}

/** Palabra que se ilumina según el avance del scroll (para el texto manifiesto). */
function ScrollWord({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1])
  return (
    <span className="relative inline-block">
      <motion.span style={{ opacity }}>{children}</motion.span>
    </span>
  )
}

/**
 * Párrafo grande cuyas palabras pasan de tenues a sólidas conforme se hace scroll.
 * Las palabras entre *asteriscos* se pintan con `accentClassName`.
 */
export function ScrollRevealText({ text, className = '', accentClassName = 'italic text-sunset-deep' }: { text: string; className?: string; accentClassName?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'end 0.6'] })
  const words = parseAccents(text.replace(/\n/g, ' ')).flat()

  if (reduce) {
    return (
      <p className={className}>
        {words.map(({ word, accent }, i) => (
          <span key={i} className={accent ? accentClassName : ''}>
            {word}{' '}
          </span>
        ))}
      </p>
    )
  }

  return (
    <p ref={ref} className={className}>
      {words.map(({ word, accent }, i) => {
        const start = i / words.length
        const end = start + 1 / words.length
        return (
          <span key={i} className={accent ? accentClassName : ''}>
            <ScrollWord progress={scrollYProgress} range={[start, end]}>
              {word}
            </ScrollWord>{' '}
          </span>
        )
      })}
    </p>
  )
}

/** Número que cuenta desde 0 cuando entra en pantalla. */
export function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: {
  to: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion() ?? false
  const value = useMotionValue(reduce ? to : 0)
  const format = (n: number) =>
    `${prefix}${n.toLocaleString('es-MX', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`
  const [text, setText] = useState(format(reduce ? to : 0))

  useEffect(() => value.on('change', (v) => setText(format(v))), [value]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(value, to, { duration: 2.2, ease: EASE })
    return () => controls.stop()
  }, [inView, reduce, to, value])

  return (
    <span ref={ref} className={`tabular-nums ${className}`} aria-label={format(to)}>
      <span aria-hidden="true">{text}</span>
    </span>
  )
}

/** Bloque que aparece desde abajo al entrar en pantalla. */
export function FadeIn({
  children,
  className = '',
  delay = 0,
  y = 40,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Sello circular con texto que gira con el scroll. */
export function SpinningSeal({ text, className = '', children }: { text: string; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotate = useTransform(scrollYProgress, [0, 1], [0, 220])
  const id = `seal-${text.length}`
  return (
    <div ref={ref} className={`relative grid place-items-center ${className}`} aria-hidden="true">
      <motion.svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" style={{ rotate }}>
        <defs>
          <path id={id} d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text className="fill-current text-[15px] font-semibold tracking-[0.32em] uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
          <textPath href={`#${id}`}>{text}</textPath>
        </text>
      </motion.svg>
      {children}
    </div>
  )
}
