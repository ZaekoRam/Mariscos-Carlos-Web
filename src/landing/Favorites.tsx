import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import { Fragment, useEffect, useRef, useState, type PointerEvent } from 'react'
import { CheckIcon, ClockIcon, PlusIcon } from '../components/icons'
import { OptionPicker } from '../components/OptionPicker'
import { useLang } from '../i18n/lang'
import { useMenuText } from '../i18n/menuText'
import { defaultSelection, findItem, type MenuItem, type Selection } from '../lib/menu'
import { EASE } from '../lib/motion'
import { useCart } from '../store/cart'
import SparkBurst from './fx/SparkBurst'
import { photo, photoSrcSet, REAL, type PhotoKey, type RealKey } from './media'
import { Eyebrow, RevealTitle } from './primitives'

interface Favorite {
  itemId: string
  title: [string, string]
  blurb: [string, string]
  real?: RealKey
  stock?: PhotoKey
  /** Tamaño en la cuadrícula tipo revista. */
  size: 'hero' | 'wide' | 'tall' | 'small'
}

/** Los platillos estrella (existen en menu.json; precio y porción salen de ahí). */
const FAVORITES: Favorite[] = [
  { itemId: 'en-aguachile-camaron-220', title: ['Aguachile de camarón', 'Shrimp aguachile'], blurb: ['El favorito de la casa. Rojo, negro o verde.', 'The house favorite. Red, black or green.'], real: 'aguachile', size: 'hero' },
  { itemId: 'cz-pulpo-zarandeado', title: ['Pulpo zarandeado', 'Pulpo zarandeado'], blurb: ['A las brasas, para compartir.', 'Charcoal-grilled, made to share.'], stock: 'pulpo', size: 'wide' },
  { itemId: 'co-coctel-camaron-grande', title: ['Coctel de camarón', 'Shrimp cocktail'], blurb: ['Frío y bien servido.', 'Ice-cold and generous.'], real: 'coctel', size: 'tall' },
  { itemId: 'cp-camaron-sin-cascara-9pzas', title: ['Camarones empanizados', 'Breaded shrimp'], blurb: ['Nueve piezas.', 'Nine pieces.'], real: 'camarones', size: 'small' },
  { itemId: 'tg-tacos-camaron-empanizado-4', title: ['Tacos de camarón', 'Shrimp tacos'], blurb: ['Orden de cuatro.', 'Order of four.'], stock: 'tacos', size: 'small' },
  { itemId: 'en-molcajete-mariscos', title: ['Molcajete de mariscos', 'Seafood molcajete'], blurb: ['Camarón, pulpo, ostión y más.', 'Shrimp, octopus, oyster and more.'], stock: 'pulpoCamaron', size: 'small' },
  { itemId: 'en-ceviche-pescado-300', title: ['Ceviche de pescado', 'Fish ceviche'], blurb: ['Fresco del día.', 'Fresh every day.'], stock: 'ceviche', size: 'small' },
]

const SIZE_CLASS: Record<Favorite['size'], string> = {
  hero: 'col-span-2 row-span-2 min-h-[380px] sm:min-h-[440px] lg:min-h-0',
  wide: 'col-span-2 min-h-[230px] lg:min-h-0',
  tall: 'col-span-1 row-span-1 min-h-[240px] sm:min-h-[260px] lg:row-span-2 lg:min-h-0',
  small: 'col-span-1 min-h-[240px] sm:min-h-[260px] lg:min-h-0',
}

/* ------------------------------------------------------------------------------------------ */
/* Antojo que rota bajo el título                                                              */
/* ------------------------------------------------------------------------------------------ */

/** Antojos que rotan en la píldora dorada (todos están en el menú). */
const CRAVINGS: { es: string; en: string }[] = [
  { es: 'aguachile', en: 'aguachile' },
  { es: 'pulpo zarandeado', en: 'grilled octopus' },
  { es: 'ceviche', en: 'ceviche' },
  { es: 'camarones al coco', en: 'coconut shrimp' },
  { es: 'un coctel', en: 'a cocktail' },
]

const ROTATE_MS = 2200
const SPRING = { type: 'spring', damping: 30, stiffness: 400 } as const
/** Resorte sin rebote para el ancho de la píldora y lo que se recorre a su lado. */
const LAYOUT_SPRING = { type: 'spring', damping: 40, stiffness: 380 } as const
const LETTER_STAGGER = 0.025

/** Palabra partida en letras: cada una entra desde abajo y sale hacia arriba, escalonadas. */
function CravingLetters({ text }: { text: string }) {
  let n = 0
  return text.split(' ').map((word, wi) => (
    <Fragment key={wi}>
      {wi > 0 ? <span className="inline-block w-[0.26em]" /> : null}
      <span className="inline-flex overflow-hidden pr-[0.05em] pb-[0.1em] -mb-[0.1em]">
        {Array.from(word).map((char, ci) => {
          const i = n++
          return (
            <motion.span
              key={ci}
              className="inline-block"
              initial={{ y: '108%' }}
              animate={{ y: '0%', transition: { ...SPRING, delay: i * LETTER_STAGGER } }}
              exit={{ y: '-118%', transition: { duration: 0.24, ease: [0.55, 0, 0.75, 0.2], delay: i * 0.012 } }}
            >
              {char}
            </motion.span>
          )
        })}
      </span>
    </Fragment>
  ))
}

function PauseGlyph({ paused }: { paused: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true" focusable="false">
      {paused ? <path d="M5 3.2v9.6L12.6 8z" fill="currentColor" /> : <path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" fill="currentColor" />}
    </svg>
  )
}

/**
 * "Hoy se te antoja [aguachile]": la palabra dentro de la píldora cambia cada ~2.2 s.
 * - Sólo rota mientras está a la vista y la pestaña está activa (nada corre fuera de pantalla).
 * - La píldora cambia de ancho con `layout` (transform), sin animar width.
 * - Con movimiento reducido queda fija en el primer antojo.
 */
function RotatingCraving() {
  const { lang, t } = useLang()
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.6 })
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const running = inView && !paused && !reduce

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % CRAVINGS.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [running])

  const craving = CRAVINGS[reduce ? 0 : index]
  const word = lang === 'en' ? craving.en : craving.es
  const prefix = t('Hoy se te antoja', 'Craving')
  const suffix = lang === 'en' ? 'today?' : ''
  const sentence = t(
    'Hoy se te antoja aguachile, pulpo zarandeado, ceviche, camarones al coco o un coctel.',
    'Craving aguachile, grilled octopus, ceviche, coconut shrimp or a cocktail today?',
  )
  const pillClass = 'relative inline-flex items-center overflow-hidden whitespace-nowrap bg-gold px-[0.42em] pt-[0.02em] pb-[0.06em] italic text-night'
  const pillStyle = { borderRadius: 9999, boxShadow: '0 3px 0 0 #c4441e' }

  return (
    <motion.div
      ref={ref}
      className="mt-7 flex flex-wrap items-center gap-x-[0.32em] gap-y-1 font-display text-[clamp(1.6rem,2.6vw,2.4rem)] leading-[1.2] tracking-[-0.01em] text-foam/85"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.35 }}
    >
      <p className="sr-only">{sentence}</p>
      <span aria-hidden="true" className="basis-full lg:basis-auto">
        {prefix}
      </span>

      {reduce ? (
        <span aria-hidden="true" className={pillClass} style={pillStyle}>
          {word}
        </span>
      ) : (
        <LayoutGroup id="favoritos-antojo">
          <motion.span layout aria-hidden="true" transition={LAYOUT_SPRING} className={pillClass} style={pillStyle}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={`${lang}-${index}`} layout className="inline-flex items-baseline">
                <CravingLetters text={word} />
              </motion.span>
            </AnimatePresence>
          </motion.span>
          {suffix ? (
            <motion.span layout="position" aria-hidden="true" transition={LAYOUT_SPRING}>
              {suffix}
            </motion.span>
          ) : null}
          <motion.button
            layout="position"
            transition={LAYOUT_SPRING}
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? t('Reanudar los antojos que cambian', 'Resume the rotating cravings') : t('Pausar los antojos que cambian', 'Pause the rotating cravings')}
            title={paused ? t('Reanudar', 'Resume') : t('Pausar', 'Pause')}
            className="relative ml-[0.15em] grid size-8 shrink-0 place-items-center self-center rounded-full border border-white/20 font-sans text-foam/70 transition-colors after:absolute after:-inset-1.5 after:rounded-full hover:border-white/45 hover:text-foam"
          >
            <PauseGlyph paused={paused} />
          </motion.button>
        </LayoutGroup>
      )}

      {reduce && suffix ? <span aria-hidden="true">{suffix}</span> : null}
    </motion.div>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Listón de esquina                                                                            */
/* ------------------------------------------------------------------------------------------ */

/**
 * Listón diagonal en la esquina (sólo CSS). Sobresale 8 px de la tarjeta y los dos
 * triangulitos oscuros simulan el doblez que pasa "detrás" del borde.
 */
function CornerRibbon({ label }: { label: string }) {
  const fold =
    "before:absolute before:top-0 before:right-0 before:-z-10 before:border-4 before:border-[#7c2a12] before:border-t-transparent before:border-l-transparent before:content-[''] after:absolute after:bottom-0 after:left-0 after:-z-10 after:border-4 after:border-[#7c2a12] after:border-t-transparent after:border-l-transparent after:content-['']"
  return (
    <div className={`pointer-events-none absolute -top-2 -left-2 z-20 size-[140px] overflow-hidden lg:size-[172px] ${fold}`}>
      <span className="absolute top-[39px] -left-[53px] flex h-9 w-[220px] -rotate-45 items-center justify-center overflow-hidden bg-linear-to-b from-sunset-deep to-sunset-darker shadow-[0_7px_14px_-5px_rgb(0_0_0/0.65)] lg:top-[50px] lg:-left-[64px] lg:h-[42px] lg:w-[270px]">
        <span aria-hidden="true" className="absolute inset-x-0 inset-y-[4px] border-y border-dashed border-white/40" />
        <span className="relative font-banner text-[13px] leading-none font-semibold tracking-[0.18em] text-white uppercase [text-shadow:0_1px_0_rgb(0_0_0/0.25)] lg:text-[15px]">
          {label}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-14 -translate-x-full -skew-x-12 bg-linear-to-r from-transparent via-white/35 to-transparent group-hover:translate-x-[22rem] group-hover:transition-transform group-hover:duration-[1100ms] group-hover:ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Tarjeta                                                                                      */
/* ------------------------------------------------------------------------------------------ */

function FavoriteCard({ fav, item, index, last }: { fav: Favorite; item: MenuItem; index: number; last: boolean }) {
  const { t } = useLang()
  const mt = useMenuText()
  const { addItem, lines } = useCart()
  const reduce = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item))
  const [added, setAdded] = useState(false)
  const [burst, setBurst] = useState(0)
  const inCart = lines.filter((l) => l.itemId === item.id).reduce((n, l) => n + l.cantidad, 0)
  const isHero = fav.size === 'hero'
  // Tarjetas angostas en el celular (la última ocupa todo el ancho, así que no cuenta).
  const compact = (fav.size === 'small' || fav.size === 'tall') && !last
  const title = t(fav.title[0], fav.title[1])

  // Inclinación 3D sutil siguiendo el cursor.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [5, -5]), { stiffness: 160, damping: 18 })
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-6, 6]), { stiffness: 160, damping: 18 })
  const glareX = useTransform(px, [-0.5, 0.5], ['0%', '100%'])
  const glare = useTransform(glareX, (x) => `radial-gradient(60% 50% at ${x} 0%, rgb(255 255 255 / 0.18), transparent 70%)`)

  const onMove = (event: PointerEvent<HTMLElement>) => {
    if (reduce || event.pointerType !== 'mouse') return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    px.set((event.clientX - rect.left) / rect.width - 0.5)
    py.set((event.clientY - rect.top) / rect.height - 0.5)
  }
  const onLeave = () => {
    px.set(0)
    py.set(0)
  }

  useEffect(() => {
    if (!added) return
    const id = window.setTimeout(() => setAdded(false), 1400)
    return () => window.clearTimeout(id)
  }, [added])

  const src = fav.real ? REAL[fav.real].src : photo(fav.stock ?? 'aguachile', isHero ? 1400 : 900)
  const srcSet = fav.real ? undefined : photoSrcSet(fav.stock ?? 'aguachile', [480, 800, 1200])

  return (
    <motion.article
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`group relative isolate rounded-[1.75rem] bg-tide text-foam shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] [transform-style:preserve-3d] ${SIZE_CLASS[fav.size]} ${last ? 'max-lg:col-span-2 max-lg:min-h-[230px]' : ''}`}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
      initial={{ opacity: 0, y: 50, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: EASE, delay: index * 0.06 }}
    >
      {/* Foto recortada en su propia capa: así el listón puede sobresalir de la tarjeta. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
        <img
          src={src}
          srcSet={srcSet}
          sizes={isHero ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-night via-night/35 to-transparent" />
        {!reduce ? (
          <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: glare }} />
        ) : null}
      </div>

      {isHero ? <CornerRibbon label={t('El más pedido', 'Most ordered')} /> : null}

      {/* Precio y etiquetas */}
      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
        <div className={`flex flex-wrap gap-1.5 ${isHero ? 'pl-28 lg:pl-36' : ''}`}>
          {item.preparacion_larga ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-night/80 px-2.5 py-1 text-[11px] text-foam">
              <ClockIcon className="size-3.5" /> {t('Tarda un poco más', 'Takes a bit longer')}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-foam px-3 py-1 font-banner text-lg font-semibold text-deep tabular-nums shadow-lg">
          {mt.price(item)}
        </span>
      </div>

      {/* Nombre, opciones y botón */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-3.5 sm:p-5">
        {/* En tarjetas chicas del celular el nombre va a todo lo ancho y el + baja a su propia fila. */}
        <div className={`flex justify-between gap-3 ${compact ? 'items-end max-sm:flex-col max-sm:items-stretch max-sm:gap-2' : 'items-end'}`}>
          <div className="min-w-0">
            <h3 className={`font-display leading-[1.02] tracking-tight drop-shadow ${isHero ? 'text-[clamp(2rem,3.4vw,3rem)]' : fav.size === 'wide' ? 'text-2xl' : 'text-lg sm:text-2xl'}`}>{title}</h3>
            <p className={`mt-1 text-foam/85 ${isHero ? 'text-base' : 'text-sm'} ${compact ? 'max-sm:hidden' : ''}`}>
              {t(fav.blurb[0], fav.blurb[1])}
              {item.porcion ? (
                <>
                  {/* En el celular la porción no queda sola en su renglón ("300 / g" o "· 300 g"):
                      se pega a la última palabra con un espacio duro; en escritorio, espacio normal. */}
                  <span className="max-lg:hidden"> </span>
                  <span className="lg:hidden">{'\u00A0'}</span>
                  <span className="whitespace-nowrap text-foam/70">· {mt.portion(item.porcion)}</span>
                </>
              ) : null}
            </p>
            {inCart > 0 ? (
              <p className="mt-1 text-xs font-semibold text-gold">
                {t('En tu pedido', 'In your order')}: {inCart}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {compact && fav.stock ? <span className="text-[10px] whitespace-nowrap text-foam/70 min-[375px]:text-[11px] sm:hidden">{t('Foto ilustrativa', 'Illustrative photo')}</span> : null}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                addItem(item, selection)
                setAdded(true)
                setBurst((n) => n + 1)
              }}
              aria-label={`${t('Agregar', 'Add')} ${title} ${t('al pedido', 'to your order')}`}
              className={`relative ml-auto grid shrink-0 place-items-center rounded-full shadow-lg transition-colors ${isHero ? 'size-14' : 'size-11 sm:size-12'} ${
                added ? 'bg-emerald-500 text-night' : 'bg-gold text-deep hover:bg-[#f7c55a]'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={added ? 'ok' : 'add'} initial={{ scale: 0.4, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.4, rotate: 90 }} transition={{ duration: 0.25 }}>
                  {added ? <CheckIcon className="size-6" /> : <PlusIcon className="size-6" />}
                </motion.span>
              </AnimatePresence>
              <SparkBurst trigger={burst} radius={isHero ? 36 : 30} />
            </motion.button>
          </div>
        </div>
        {isHero && item.opciones?.length ? (
          <div className="max-w-sm">
            <OptionPicker item={item} selection={selection} onChange={setSelection} size="sm" tone="dark" />
          </div>
        ) : null}
        {fav.stock ? <span className={`text-[11px] text-foam/70 lg:text-[10px] ${compact ? 'max-sm:hidden' : ''}`}>{t('Foto ilustrativa', 'Illustrative photo')}</span> : null}
      </div>
      <span className="sr-only" aria-live="polite">
        {added ? `${t('Agregaste', 'Added')} ${title}` : ''}
      </span>
    </motion.article>
  )
}

/**
 * "Lo que más se pide": cuadrícula tipo revista con fotos grandes siempre visibles.
 * Cada tarjeta trae precio y botón para agregar; al pasar el cursor se inclina en 3D.
 */
export default function Favorites() {
  const { t } = useLang()
  const items = FAVORITES.map((fav) => ({ fav, item: findItem(fav.itemId) })).filter(
    (row): row is { fav: Favorite; item: MenuItem } => Boolean(row.item),
  )

  return (
    <section
      id="especialidades"
      aria-labelledby="favoritos-title"
      className="relative overflow-hidden bg-night px-5 py-20 text-foam sm:px-8 sm:py-24 md:py-32"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-40 size-[620px] rounded-full bg-ocean/25 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-0 size-[520px] rounded-full bg-sunset/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Eyebrow tone="light">{t('Los favoritos', 'House favorites')}</Eyebrow>
            <RevealTitle
              id="favoritos-title"
              text={t('Lo que más *se\u00A0pide*', 'What everyone *orders*')}
              className="mt-5 font-display text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.03em]"
              accentClassName="italic text-gold"
            />
            <RotatingCraving />
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end md:text-right">
            <p className="max-w-xs text-foam/80">
              {t('Los platillos que más salen de la cocina. Toca + y van directo a tu pedido.', 'The dishes our kitchen sends out the most. Tap + to add them to your order.')}
            </p>
            <a href="#menu" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold transition-colors hover:bg-white/10">
              {t('Ver el menú completo', 'See the full menu')} →
            </a>
          </div>
        </div>

        <div className="mt-10 grid grid-flow-dense grid-cols-2 gap-3.5 sm:mt-12 sm:gap-4 lg:auto-rows-[260px] lg:grid-cols-4">
          {items.map(({ fav, item }, i) => (
            <FavoriteCard key={fav.itemId} fav={fav} item={item} index={i} last={i === items.length - 1} />
          ))}
        </div>
      </div>
    </section>
  )
}
