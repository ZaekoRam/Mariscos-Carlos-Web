import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react'
import logo from '../assets/logo-marlin-640.webp'
import { ArrowRightIcon, CalendarIcon, StarIcon, WhatsAppIcon } from '../components/icons'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { useOpenStatus } from '../lib/hours'
import { ALL_ITEMS } from '../lib/menu'
import { EASE } from '../lib/motion'
import { useCart } from '../store/cart'
import PopOutCrew from './fx/PopOutCrew'
import { VIDEOS } from './media'
import { BgVideo, RevealTitle } from './primitives'

function MenuGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5v-13ZM20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5v-13Z" />
      <path d="M7 8h2.5M7 11.5h2.5M14.5 8H17M14.5 11.5H17" />
    </svg>
  )
}

interface Action {
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  title: string
  text: string
  accent: string
  /** Tarjeta con la "tripulación" que se asoma (pedir por WhatsApp). */
  crew?: boolean
}

/**
 * En pantallas táctiles no hay hover: la tripulación se asoma sola una vez, al terminar la entrada.
 * Sólo en tableta (md+, tarjetas en fila). En el celular las tarjetas van apiladas y la tripulación
 * taparía el texto de la tarjeta de arriba, así que ahí no se muestra.
 */
const CREW_TOUCH_DELAY = 3400
const CREW_TOUCH_DURATION = 2500
const CREW_TOUCH_QUERY = '(hover: none) and (min-width: 768px)'

/**
 * Hero: video real de playa con parallax (scroll y cursor). Lo primero que se ve son las tres
 * cosas a las que viene el cliente: ver el menú, pedir por WhatsApp o reservar una mesa.
 */
export default function HeroCinematic() {
  const { t } = useLang()
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion() ?? false
  const status = useOpenStatus()
  const { count } = useCart()
  // Celular: el texto del hero se pinta de inmediato (sin entrada animada) para que aparezca cuanto antes.
  const [instant] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  const enter = !instant

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const videoY = useTransform(scrollYProgress, [0, 1], ['0%', '28%'])
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.06, 1.22])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-25%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const veil = useTransform(scrollYProgress, [0, 1], [0, 0.65])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 })
  const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 })
  const mediaX = useTransform(sx, (v) => v * -18)
  const mediaY = useTransform(sy, (v) => v * -12)
  const titleX = useTransform(sx, (v) => v * 10)
  const titleY = useTransform(sy, (v) => v * 6)

  useEffect(() => {
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return
    const onMove = (event: PointerEvent) => {
      mx.set(event.clientX / window.innerWidth - 0.5)
      my.set(event.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [reduce, mx, my])

  const [crewOn, setCrewOn] = useState(false)
  useEffect(() => {
    if (reduce || !window.matchMedia(CREW_TOUCH_QUERY).matches) return
    let off = 0
    const on = window.setTimeout(() => {
      // Si ya bajó por la página, no tiene caso.
      if (window.scrollY > window.innerHeight * 0.4) return
      setCrewOn(true)
      off = window.setTimeout(() => setCrewOn(false), CREW_TOUCH_DURATION)
    }, CREW_TOUCH_DELAY)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(off)
    }
  }, [reduce])

  const actions: Action[] = [
    {
      href: '#menu',
      icon: MenuGlyph,
      title: t('Ver el menú', 'See the menu'),
      text: t(`${ALL_ITEMS.length} platillos con precios`, `${ALL_ITEMS.length} dishes with prices`),
      accent: 'bg-foam text-deep',
    },
    {
      href: '#pedir',
      icon: WhatsAppIcon,
      title: t('Pedir por WhatsApp', 'Order on WhatsApp'),
      text: count > 0 ? t(`Tienes ${count} en tu pedido`, `${count} in your order`) : t('Para llevar o desde tu mesa', 'Takeout or from your table'),
      accent: 'bg-sunset-deep text-white',
      crew: true,
    },
    {
      href: '#reservar',
      icon: CalendarIcon,
      title: t('Reservar mesa', 'Book a table'),
      text: t('Elige día y hora en un minuto', 'Pick day & time in a minute'),
      accent: 'bg-gold text-deep',
    },
  ]

  return (
    <section
      ref={ref}
      id="inicio"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-clip bg-night text-foam"
    >
      <motion.div aria-hidden="true" className="absolute inset-0 -z-20" style={reduce ? undefined : { y: videoY }}>
        <motion.div className="absolute -inset-[4%]" style={reduce ? undefined : { x: mediaX, y: mediaY, scale: videoScale }}>
          <motion.div
            className="h-full w-full"
            initial={reduce || instant ? false : { scale: 1.18 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.6, ease: EASE }}
          >
            <BgVideo video={VIDEOS.hero} eager />
          </motion.div>
          {/* Entrada: el video aparece desde la oscuridad (opacidad en vez de filtro, mucho más ligero). */}
          <motion.div
            className="absolute inset-0 bg-night"
            initial={reduce || instant ? false : { opacity: 0.65 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2.6, ease: EASE }}
          />
        </motion.div>
      </motion.div>

      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_75%_30%,rgb(242_177_52/0.14),transparent_55%)]" />
        <div className="absolute inset-0 bg-linear-to-b from-night/55 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-night via-night/40 to-transparent to-70%" />
        <div className="absolute inset-0 bg-linear-to-r from-night/55 via-night/10 to-transparent" />
        <motion.div className="absolute inset-0 bg-night" style={{ opacity: veil }} />
        <div className="film-grain absolute inset-0 opacity-[0.035]" />
      </div>

      <motion.div
        className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-5 pt-[calc(var(--header-h,6rem)+1.5rem)] pb-12 sm:px-8 sm:pt-[calc(var(--header-h,6rem)+2.5rem)] md:pb-16"
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
          <motion.div style={reduce ? undefined : { x: titleX, y: titleY }}>
            {/* Celular: dos renglones intencionales (ciudad / desde + estado) en vez de un corte al azar. */}
            <motion.p
              className="mb-5 flex flex-col items-start gap-y-2 text-[11px] font-semibold tracking-[0.3em] text-gold uppercase sm:inline-flex sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3"
              initial={enter ? { opacity: 0, y: 16 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.5 }}
            >
              <span className="inline-flex items-center gap-x-3">
                <span aria-hidden="true" className="h-px w-10 bg-gold/70" />
                {SITE.ciudad}
                <span aria-hidden="true" className="text-foam/40 max-sm:hidden">✦</span>
              </span>
              <span className="inline-flex items-center gap-x-3">
                {t('Desde', 'Since')} {SITE.desde}
                <span aria-hidden="true" className="text-foam/40">✦</span>
                <span className={status.isOpen ? 'text-emerald-300' : 'text-[#FFB59C]'}>{status.isOpen ? t('Abierto ahora', 'Open now') : t('Cerrado ahora', 'Closed now')}</span>
              </span>
            </motion.p>

            <motion.div initial={enter ? { opacity: 0, scale: 0.96 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: EASE }}>
              <RevealTitle
                as="h1"
                id="hero-title"
                text={t('Mariscos frescos.\n*Mesa lista.*', 'Fresh seafood.\n*Table ready.*')}
                className="font-display text-[clamp(3rem,8vw,8.25rem)] leading-[0.88] tracking-[-0.035em] text-foam drop-shadow-[0_8px_40px_rgb(0_0_0/0.35)]"
                accentClassName="italic text-gold"
                delay={0.35}
                instant={instant}
              />
            </motion.div>

            <motion.p
              className="mt-6 max-w-xl text-base leading-relaxed text-foam/85 md:text-lg"
              initial={enter ? { opacity: 0, y: 20 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.9 }}
            >
              {t(
                'Los más frescos de Manzanillo desde 2004. Mira el menú, pide por WhatsApp o aparta tu mesa.',
                'The freshest in Manzanillo since 2004. Browse the menu, order on WhatsApp or book your table.',
              )}
            </motion.p>
          </motion.div>

          <motion.a
            href="#resenas"
            className="hidden w-64 rounded-[2rem] border border-white/15 bg-night/70 p-5 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] transition-colors hover:bg-night/80 lg:block"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: EASE, delay: 1.2 }}
          >
            <div className="flex items-center gap-4">
              <motion.img
                src={logo}
                alt=""
                width={72}
                height={72}
                loading="lazy"
                className="size-18 shrink-0 drop-shadow-[0_10px_20px_rgb(0_0_0/0.4)]"
                animate={reduce ? undefined : { rotate: [0, -6, 0, 6, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div>
                <p className="font-display text-4xl leading-none">{SITE.calificacion.google.toFixed(1)}</p>
                <p className="mt-1.5 flex gap-0.5 text-gold" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon key={i} className="size-3.5" />
                  ))}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-foam/80">
              {SITE.calificacion.resenasGoogleTexto} {t('reseñas en Google', 'Google reviews')} · {SITE.calificacion.facebookRecomienda}%{' '}
              {t('lo recomienda en Facebook', 'recommend on Facebook')}
            </p>
          </motion.a>
        </div>

        <nav aria-label={t('Acciones principales', 'Main actions')} className="mt-10">
          {/* grid-cols-1 (minmax(0,1fr)): sin él, el texto truncado ensancha la columna y las tarjetas se salen del margen. */}
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            {actions.map((action, i) => {
              const Icon = action.icon
              return (
                <motion.li
                  key={action.href}
                  initial={enter ? { opacity: 0, y: 30 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: EASE, delay: 1.05 + i * 0.1 }}
                >
                  <motion.a
                    href={action.href}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative flex h-full items-center gap-3 rounded-[1.6rem] border border-white/15 bg-night/75 p-3 pr-4 transition-colors hover:border-white/35 hover:bg-night/90 sm:gap-4 sm:pr-5 md:p-4"
                  >
                    {action.crew ? (
                      // Sólo md+: en el celular las tarjetas van apiladas y la tripulación tapaba el texto de "Ver el menú".
                      <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
                        <PopOutCrew active={crewOn} />
                      </span>
                    ) : null}
                    <span className={`grid size-12 shrink-0 place-items-center rounded-2xl md:size-14 ${action.accent}`}>
                      <Icon className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-xl leading-tight md:text-2xl">{action.title}</span>
                      <span className="block truncate text-sm text-foam/75">{action.text}</span>
                    </span>
                    <ArrowRightIcon className="size-5 shrink-0 text-foam/70 transition-transform group-hover:translate-x-1 group-hover:text-gold" />
                  </motion.a>
                </motion.li>
              )
            })}
          </ul>
        </nav>
      </motion.div>
    </section>
  )
}
