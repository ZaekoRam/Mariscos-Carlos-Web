import { AnimatePresence, LayoutGroup, motion, type PanInfo } from 'motion/react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BagIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  PlusIcon,
  SearchIcon,
} from '../components/icons'
import { getFocusable, lockBodyScroll } from '../components/navbar/shared'
import { OptionPicker } from '../components/OptionPicker'
import { useLang } from '../i18n/lang'
import { useMenuText, type MenuText } from '../i18n/menuText'
import { CATEGORIES, defaultSelection, formatMXN, groupBySection, matchesSearch, normalizeText, type MenuCategory, type MenuItem, type Selection } from '../lib/menu'
import { EASE } from '../lib/motion'
import { useCart } from '../store/cart'
import SparkBurst from './fx/SparkBurst'
import { photo, REAL, type PhotoKey, type RealKey } from './media'
import { Eyebrow, RevealTitle } from './primitives'

/* ------------------------------------------------------------------------------------------ */
/* Datos de cada página                                                                         */
/* ------------------------------------------------------------------------------------------ */

/** Foto de cada página (real cuando existe; si no, ilustrativa). */
const COVERS: Record<string, { real?: RealKey; stock?: PhotoKey }> = {
  'camarones-pulpo': { real: 'camarones' },
  entradas: { real: 'aguachile' },
  'tacos-guarniciones': { stock: 'tacos' },
  cocteleria: { real: 'coctel' },
  'pescados-filetes': { stock: 'ceviche' },
  temporada: { stock: 'pulpoFresco' },
  'caldos-zarandeados': { stock: 'pulpo' },
  'pollo-carne': { stock: 'tacosMargarita' },
  bebidas: { stock: 'cerveza' },
  postres: { real: 'fachada' },
}

function coverOf(category: MenuCategory) {
  const c = COVERS[category.id] ?? { real: 'fachada' as RealKey }
  return c.real ? { src: REAL[c.real].src, illustrative: false } : { src: photo(c.stock ?? 'aguachile', 640), illustrative: true }
}

/** Renglones de muestra en cada hoja cuando se ve en celular (2 columnas): pocos y legibles. */
const MOBILE_PREVIEW = 3

/** Caracteres (nombre + precio) que caben completos en un renglón de la hoja angosta. */
const MOBILE_FIT = 18

/**
 * Muestra de una hoja en celular: primero los platillos que caben completos (en el orden del menú)
 * y luego los que menos se cortan, para no ver "Orden de ca…" repetido en la hoja angosta.
 */
function shortestItems(items: MenuItem[], mt: MenuText): MenuItem[] {
  return items
    .map((item, i) => ({ item, i, w: Math.max(0, mt.itemName(item).length + mt.price(item).length - MOBILE_FIT) }))
    .sort((a, b) => a.w - b.w || a.i - b.i)
    .slice(0, MOBILE_PREVIEW)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.item)
}

/** Inclinación de cada hoja sobre el mantel. */
const TILTS = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 1.5, -1, 2]

/* ------------------------------------------------------------------------------------------ */
/* Piezas visuales del menú impreso                                                             */
/* ------------------------------------------------------------------------------------------ */

/** Listón azul con puntas recortadas, como los encabezados del menú impreso del restaurante. */
export function Ribbon({ children, size = 'md' }: { children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  // En celular los nombres largos pueden partirse en dos renglones: se equilibran (text-balance) y,
  // en las hojas chicas, el listón ocupa todo el ancho con la misma altura en todas para que los
  // renglones de cada fila arranquen parejos. Desde `sm` se ve igual que siempre.
  const text =
    size === 'lg'
      ? 'inline-block text-[1.35rem] leading-[1.2] px-8 py-2 max-sm:text-balance sm:text-[clamp(1.6rem,4vw,2.6rem)] sm:leading-[inherit] sm:px-12 sm:py-2.5'
      : size === 'md'
        ? 'inline-block text-lg px-8 py-1.5 max-sm:text-balance max-sm:px-7'
        : 'flex min-h-9 w-full items-center justify-center text-[10.5px] leading-tight px-3 py-1 max-sm:text-balance sm:inline-block sm:min-h-0 sm:w-auto sm:text-[11px] sm:px-5'
  return (
    <span
      className={`relative bg-deep font-banner font-semibold tracking-[0.12em] text-foam uppercase ${text}`}
      style={{ clipPath: 'polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%, 4% 50%)' }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-[3px] border border-white/35"
        style={{ clipPath: 'polygon(0 0, 100% 0, 96% 50%, 100% 100%, 0 100%, 4% 50%)' }}
      />
      <span className="relative">{children}</span>
    </span>
  )
}

/**
 * Nombre de categoría dentro de un listón. Si trae una aclaración entre paréntesis (p. ej.
 * "Soups & zarandeados (grilled)"), en celular se omite en las hojas chicas o baja a un renglón
 * pequeño en el lector, para que el listón no crezca a tres renglones. Desde `sm` se ve completo.
 */
function CategoryLabel({ name, aside }: { name: string; aside: 'hide' | 'below' }) {
  const match = /^(.*?)\s*(\([^)]*\))$/.exec(name)
  if (!match) return <>{name}</>
  return (
    <>
      <span className="sm:hidden">
        {match[1]}
        {aside === 'below' ? <span className="mt-1 block text-[0.6em] tracking-[0.2em] opacity-85">{match[2]}</span> : null}
      </span>
      <span className="hidden sm:inline">{name}</span>
    </>
  )
}

/** Miniatura de una página del menú sobre el mantel. */
function PageThumb({ category, index, mt, onOpen }: { category: MenuCategory; index: number; mt: MenuText; onOpen: () => void }) {
  const { t } = useLang()
  const cover = coverOf(category)
  const preview = category.items.slice(0, 7)
  const mobileItems = shortestItems(category.items, mt)
  const more = (n: number) => (n === 1 ? t('platillo más', 'more dish') : t('platillos más', 'more dishes'))
  const row = (item: MenuItem) => (
    <li key={item.id} className="flex items-baseline gap-1 text-[11px] leading-tight sm:gap-1.5 sm:text-[10.5px]">
      <span className="min-w-0 truncate font-semibold">{mt.itemName(item)}</span>
      <span className="min-w-2 flex-1 border-b border-dotted border-deep/30 sm:min-w-3" />
      <span className="shrink-0 font-semibold tabular-nums">{mt.price(item)}</span>
    </li>
  )
  return (
    <motion.button
      type="button"
      layoutId={`menu-page-${category.id}`}
      onClick={onOpen}
      aria-label={`${t('Abrir la página', 'Open page')}: ${mt.categoryName(category)} (${category.items.length} ${t('platillos', 'dishes')})`}
      className="group relative flex w-full min-w-0 flex-col overflow-hidden rounded-[6px] text-left text-deep shadow-[0_24px_40px_-18px_rgb(19_50_74/0.55),0_2px_4px_rgb(19_50_74/0.2)] menu-paper"
      style={{ rotate: TILTS[index % TILTS.length] }}
      whileHover={{ rotate: 0, y: -14, scale: 1.04, transition: { duration: 0.5, ease: EASE } }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex flex-1 flex-col px-3 pt-4 pb-2.5 sm:px-4 sm:pt-5 sm:pb-3">
        <div className="text-center">
          <Ribbon size="sm">
            <CategoryLabel name={mt.categoryName(category)} aside="hide" />
          </Ribbon>
        </div>
        {/* Celular: 3 renglones que se leen completos. Desde `sm`: los primeros 7, como siempre. */}
        <ul className="mt-3 flex-1 space-y-2 sm:hidden" aria-hidden="true">
          {mobileItems.map(row)}
        </ul>
        <ul className="mt-4 hidden flex-1 space-y-1.5 sm:block" aria-hidden="true">
          {preview.map(row)}
        </ul>
        {category.items.length > MOBILE_PREVIEW ? (
          <p className="mt-2.5 text-[11px] font-semibold text-sunset-deep sm:hidden">
            + {category.items.length - MOBILE_PREVIEW} {more(category.items.length - MOBILE_PREVIEW)}
          </p>
        ) : null}
        {category.items.length > preview.length ? (
          <p className="mt-2 hidden text-[10px] font-semibold text-sunset-deep sm:block">
            + {category.items.length - preview.length} {more(category.items.length - preview.length)}
          </p>
        ) : null}
      </div>
      <div className="relative mx-2.5 mb-2.5 h-14 overflow-hidden rounded-full sm:mx-3 sm:mb-3 sm:h-20">
        <img src={cover.src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
      </div>
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-deep/0 transition-colors duration-300 group-hover:bg-deep/10">
        <span className="translate-y-3 rounded-full bg-deep px-4 py-2 text-xs font-semibold text-foam opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {t('Ver página', 'Open page')} →
        </span>
      </span>
    </motion.button>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Lector (página abierta)                                                                     */
/* ------------------------------------------------------------------------------------------ */

function ReaderItem({ item, mt, highlighted }: { item: MenuItem; mt: MenuText; highlighted: boolean }) {
  const { t } = useLang()
  const { addItem, lines } = useCart()
  const [open, setOpen] = useState(false)
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item))
  const [added, setAdded] = useState(false)
  const [sparks, setSparks] = useState(0)
  const ref = useRef<HTMLLIElement>(null)
  const inCart = lines.filter((l) => l.itemId === item.id).reduce((n, l) => n + l.cantidad, 0)
  const hasOptions = Boolean(item.opciones?.length)
  const description = mt.itemDescription(item)

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlighted])

  useEffect(() => {
    if (!added) return
    const id = window.setTimeout(() => setAdded(false), 1300)
    return () => window.clearTimeout(id)
  }, [added])

  const add = () => {
    addItem(item, selection)
    setAdded(true)
    setSparks((n) => n + 1)
    setOpen(false)
  }

  return (
    <li
      ref={ref}
      className={`break-inside-avoid rounded-xl px-3 py-2.5 transition-colors ${highlighted ? 'animate-[pulse_1.2s_ease-in-out_2] bg-gold/25' : 'hover:bg-deep/[0.04]'}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* En celular la porción fluye justo después del nombre (no queda flotando a la derecha). */}
          <p className="items-baseline gap-2 max-sm:block sm:flex">
            <span className="font-semibold text-deep">{mt.itemName(item)}</span>
            {item.porcion ? (
              <span className="shrink-0 text-sm text-deep/70 max-sm:ml-1.5 max-sm:whitespace-nowrap">{mt.portion(item.porcion)}</span>
            ) : null}
          </p>
          {description ? <p className="mt-0.5 text-sm leading-snug text-deep/75">{description}</p> : null}
          {!open && hasOptions ? (
            <p className="mt-0.5 text-sm text-deep/70">({item.opciones?.map((g) => g.valores.map(mt.value).join(', ')).join(' · ')})</p>
          ) : null}
          <p className="mt-1 flex flex-wrap gap-1.5">
            {item.temporada ? <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold tracking-wide text-deep uppercase sm:text-[10px]">{t('Temporada', 'Seasonal')}</span> : null}
            {item.por_kilo ? (
              <span className="rounded-full bg-ocean-deep px-2 py-0.5 text-[11px] font-semibold text-white sm:text-[10px]">{t('Por kilo · según el peso', 'Per kg · by weight')}</span>
            ) : null}
            {item.preparacion_larga ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-ocean-deep" title={mt.notas.preparacion_larga}>
                <ClockIcon className="size-3.5" /> {t('Tarda un poco más', 'Takes a bit longer')}
              </span>
            ) : null}
            {inCart > 0 ? <span className="text-[11px] font-semibold text-ocean-deep">{t('En tu pedido', 'In your order')}: {inCart}</span> : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="font-banner text-lg font-semibold text-deep tabular-nums">{mt.price(item)}</span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => (hasOptions ? setOpen((v) => !v) : add())}
            aria-expanded={hasOptions ? open : undefined}
            aria-label={`${hasOptions ? t('Elegir opciones de', 'Choose options for') : t('Agregar', 'Add')} ${mt.itemName(item)}`}
            className={`relative grid size-10 place-items-center rounded-full transition-colors ${
              added ? 'bg-emerald-700 text-white' : open ? 'bg-sunset-deep text-white' : 'bg-deep text-foam hover:bg-sunset-deep'
            }`}
          >
            {added ? <CheckIcon className="size-4" /> : <PlusIcon className={`size-4 transition-transform ${open ? 'rotate-45' : ''}`} />}
            <SparkBurst trigger={sparks} radius={30} />
          </motion.button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col gap-3.5 rounded-xl bg-sand/70 p-4 sm:gap-3 sm:p-3">
              <OptionPicker item={item} selection={selection} onChange={setSelection} size="sm" />
              <button
                type="button"
                onClick={add}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sunset-deep px-5 text-sm font-semibold text-white hover:bg-sunset-darker"
              >
                <PlusIcon className="size-4" /> {t('Agregar al pedido', 'Add to order')}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <span className="sr-only" aria-live="polite">
        {added ? `${t('Agregaste', 'Added')} ${mt.itemName(item)}` : ''}
      </span>
    </li>
  )
}

function ReaderPage({ category, mt, highlight }: { category: MenuCategory; mt: MenuText; highlight: string | null }) {
  const { t } = useLang()
  const cover = coverOf(category)
  const groups = groupBySection(category.items)
  return (
    <div className="px-5 pt-8 pb-6 sm:px-10 sm:pt-10">
      <div className="text-center">
        <Ribbon size="lg">
          <CategoryLabel name={mt.categoryName(category)} aside="below" />
        </Ribbon>
      </div>
      {mt.categoryNotes(category).map((nota) => (
        <p key={nota} className="mx-auto mt-5 max-w-2xl text-center text-sm text-deep/75 italic">
          {nota}
        </p>
      ))}
      <div className="mt-8">
        {groups.map((group, gi) => (
          <div key={(group.seccion ?? '') + gi} className="mb-6">
            {group.seccion ? (
              <div className="mb-3 text-center">
                <Ribbon size="md">{mt.section(group.seccion)}</Ribbon>
              </div>
            ) : null}
            <ul className="gap-x-8 md:columns-2">
              {group.items.map((item) => (
                <ReaderItem key={item.id} item={item} mt={mt} highlighted={highlight === item.id} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {category.id === 'caldos-zarandeados' ? (
        <div className="mt-4 grid gap-4 rounded-2xl border border-deep/10 p-5 text-sm md:grid-cols-2">
          <dl className="space-y-1.5">
            {mt.glosario.map((g) => (
              <div key={g.termino}>
                <dt className="inline font-semibold">{g.termino}: </dt>
                <dd className="inline text-deep/75">{g.descripcion}</dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="font-banner font-semibold tracking-wider uppercase">{t('Guarniciones', 'Sides')}</p>
            <p className="mt-1 text-deep/75">{mt.guarniciones.join(' · ')}</p>
          </div>
        </div>
      ) : null}

      <div className="relative mt-6 h-32 overflow-hidden rounded-full sm:h-44">
        <img src={cover.src} alt="" className="h-full w-full object-cover" />
        {cover.illustrative ? (
          <span className="absolute right-6 bottom-3 rounded-full bg-night/60 px-2 py-0.5 text-[10px] text-foam">{t('Foto ilustrativa', 'Illustrative photo')}</span>
        ) : null}
      </div>
      <div className="mt-5 flex flex-col justify-between gap-1 text-xs text-deep/75 italic sm:flex-row">
        <p>*{mt.notas.temporada}*</p>
        <p>*{mt.notas.facturacion}*</p>
      </div>
    </div>
  )
}

function Reader({
  index,
  highlight,
  onIndex,
  onClose,
  mt,
}: {
  index: number
  highlight: string | null
  onIndex: (next: number) => void
  onClose: () => void
  mt: MenuText
}) {
  const { t } = useLang()
  const { count, total, hasPerKilo, openCart } = useCart()
  const ref = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [direction, setDirection] = useState(0)
  const category = CATEGORIES[index]
  const titleId = useId()

  const go = useCallback(
    (delta: number) => {
      const next = (index + delta + CATEGORIES.length) % CATEGORIES.length
      setDirection(delta)
      onIndex(next)
      scrollRef.current?.scrollTo({ top: 0 })
    },
    [index, onIndex],
  )

  useEffect(() => {
    const unlock = lockBodyScroll()
    const opener = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      unlock()
      opener?.focus?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target instanceof Element && target.matches('input, textarea, select')
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowRight' && !typing) go(1)
      else if (event.key === 'ArrowLeft' && !typing) go(-1)
      else if (event.key === 'Tab' && ref.current) {
        const items = getFocusable(ref.current)
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, onClose])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -90) go(1)
    else if (info.offset.x > 90) go(-1)
  }

  const prev = CATEGORIES[(index - 1 + CATEGORIES.length) % CATEGORIES.length]
  const next = CATEGORIES[(index + 1) % CATEGORIES.length]
  // En celular, con pedido en curso, "Anterior / Siguiente" se vuelven flechas redondas para que la
  // píldora del pedido quepa en un renglón (el texto sigue disponible para lectores de pantalla).
  const navCompact = count > 0 ? 'max-sm:size-11 max-sm:justify-center max-sm:border max-sm:border-white/20 max-sm:bg-white/10 max-sm:px-0' : ''
  const navLabel = count > 0 ? 'max-sm:sr-only' : ''

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex flex-col"
      initial={{ opacity: 1 }}
      exit={{ opacity: 1 }}
    >
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-night/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <h2 id={titleId} className="sr-only">
        {t('Menú', 'Menu')}: {mt.categoryName(category)}
      </h2>

      {/* Barra superior */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] text-foam sm:px-6">
        <p className="font-banner text-sm tracking-[0.2em] uppercase">
          {t('Página', 'Page')} {index + 1} / {CATEGORIES.length}
        </p>
        <button
          type="button"
          data-autofocus
          onClick={onClose}
          aria-label={t('Cerrar el menú', 'Close the menu')}
          className="grid size-11 place-items-center rounded-full border border-white/25 bg-white/10 hover:bg-white/20"
        >
          <CloseIcon className="size-5" />
        </button>
      </div>

      {/* Página */}
      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-3 py-4 sm:px-6" data-lenis-prevent>
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.article
            key={category.id}
            layoutId={`menu-page-${category.id}`}
            custom={direction}
            initial={direction === 0 ? false : { x: direction * 120, opacity: 0, rotate: direction * 3 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ x: direction * -120, opacity: 0, rotate: direction * -3 }}
            transition={{ duration: 0.55, ease: EASE }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
            className="mx-auto w-full max-w-4xl overflow-hidden rounded-md text-deep shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] menu-paper"
          >
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }}>
              <ReaderPage category={category} mt={mt} highlight={highlight} />
            </motion.div>
          </motion.article>
        </AnimatePresence>
      </div>

      {/* Navegación */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-t border-white/10 bg-night/70 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-foam backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={() => go(-1)}
          className={`inline-flex h-11 min-w-0 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-white/10 ${navCompact}`}
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          <span className="hidden truncate sm:inline">{mt.categoryName(prev)}</span>
          <span className={`sm:hidden ${navLabel}`}>{t('Anterior', 'Prev')}</span>
        </button>
        <div className="hidden gap-1.5 md:flex" aria-hidden="true">
          {CATEGORIES.map((c, i) => (
            <span key={c.id} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-gold' : 'w-1.5 bg-white/30'}`} />
          ))}
        </div>
        {count > 0 ? (
          <button
            type="button"
            onClick={() => {
              onClose()
              window.setTimeout(openCart, 250)
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold whitespace-nowrap text-deep"
          >
            <BagIcon className="size-4 shrink-0" />
            {count} · {formatMXN(total)}
            {hasPerKilo ? ' + kg' : ''}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => go(1)}
          className={`inline-flex h-11 min-w-0 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-white/10 ${navCompact}`}
        >
          <span className="hidden truncate sm:inline">{mt.categoryName(next)}</span>
          <span className={`sm:hidden ${navLabel}`}>{t('Siguiente', 'Next')}</span>
          <ArrowRightIcon className="size-4 shrink-0" />
        </button>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Sección                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/**
 * "La carta": las 10 páginas del menú impreso sobre el mantel del restaurante. Al tocar una,
 * se abre con zoom y se puede hojear (flechas, teclado o deslizando) y agregar platillos.
 */
export default function MenuBook() {
  const { t } = useLang()
  const mt = useMenuText()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const searchId = useId()

  const results = useMemo(() => {
    const q = normalizeText(query)
    if (!q) return []
    return CATEGORIES.flatMap((c, ci) =>
      c.items
        .filter((item) => matchesSearch(item, query) || normalizeText(mt.itemName(item)).includes(q))
        .map((item) => ({ item, category: c, ci })),
    ).slice(0, 12)
  }, [query, mt])

  const open = (index: number, itemId: string | null = null) => {
    setHighlight(itemId)
    setOpenIndex(index)
  }

  return (
    <section id="menu" aria-labelledby="menu-title" className="relative overflow-hidden tablecloth px-5 pt-24 pb-20 text-deep sm:px-8 sm:pb-28 md:pt-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_40%,rgb(251_246_236/0.15),rgb(251_246_236/0.85))]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="relative z-20 mx-auto max-w-3xl rounded-[2rem] bg-foam/90 px-5 py-9 text-center shadow-[0_30px_60px_-40px_rgb(19_50_74/0.6)] backdrop-blur-sm sm:px-10 sm:py-8">
          <Eyebrow className="justify-center">{t('La carta', 'The menu')}</Eyebrow>
          <RevealTitle
            id="menu-title"
            text={t('Nuestro *menú*', 'Our *menu*')}
            className="mt-4 font-display text-[clamp(3rem,7vw,6rem)] leading-[0.9] tracking-[-0.03em]"
          />
          <p className="mx-auto mt-5 max-w-xl text-deep/75 max-sm:text-balance">
            {t(
              'El mismo menú que tenemos en la mesa. Toca una página para abrirla, hojéala y agrega lo que se te antoje.',
              'The same menu we have on the table. Tap a page to open it, flip through and add whatever you crave.',
            )}
          </p>

          <div className="relative mx-auto mt-7 max-w-md text-left">
            <label htmlFor={searchId} className="sr-only">
              {t('Buscar un platillo', 'Search for a dish')}
            </label>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-deep/70" />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Busca: pulpo, aguachile, coco…', 'Search: octopus, aguachile, coconut…')}
              autoComplete="off"
              className="h-14 w-full rounded-full border border-deep/20 bg-white pr-4 pl-12 text-base text-deep placeholder:text-deep/70 max-sm:placeholder:text-transparent"
            />
            {/* En celular el texto de ayuda completo no cabe y se cortaba a media palabra: se muestra una versión corta. */}
            {query ? null : (
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 left-12 -translate-y-1/2 truncate text-base text-deep/70 sm:hidden">
                {t('Busca: pulpo, aguachile…', 'Search: octopus, coconut…')}
              </span>
            )}
            <AnimatePresence>
              {query.trim() ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-deep/10 bg-white p-2 shadow-2xl"
                  data-lenis-prevent
                >
                  <p className="px-3 py-2 text-xs text-deep/70" aria-live="polite">
                    {results.length
                      ? `${results.length} ${t(results.length === 1 ? 'platillo' : 'platillos', results.length === 1 ? 'dish' : 'dishes')}`
                      : t(`No encontramos “${query}”.`, `No results for “${query}”.`)}
                  </p>
                  <ul>
                    {results.map(({ item, category, ci }) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            open(ci, item.id)
                            setQuery('')
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-sand"
                        >
                          <span>
                            <span className="block font-semibold">{mt.itemName(item)}</span>
                            <span className="text-xs text-deep/70">
                              {mt.categoryName(category)}
                              {item.porcion ? ` · ${mt.portion(item.porcion)}` : ''}
                            </span>
                          </span>
                          <span className="shrink-0 font-banner font-semibold">{mt.price(item)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <LayoutGroup id="menu-book">
          <div
            className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 pt-2 pb-6 sm:mt-14 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-14 sm:pt-6 sm:pb-10 lg:grid-cols-5"
          >
            {CATEGORIES.map((category, i) => (
              <motion.div
                key={category.id}
                className="flex min-w-0"
                initial={{ opacity: 0, y: 60, rotate: TILTS[i] * 3 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.9, ease: EASE, delay: (i % 5) * 0.07 }}
              >
                {openIndex === i ? (
                  <div className="aspect-[3/4] w-full" aria-hidden="true" />
                ) : (
                  <PageThumb category={category} index={i} mt={mt} onOpen={() => open(i)} />
                )}
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {openIndex !== null ? (
              <Reader
                index={openIndex}
                highlight={highlight}
                onIndex={(n) => {
                  setHighlight(null)
                  setOpenIndex(n)
                }}
                onClose={() => setOpenIndex(null)}
                mt={mt}
              />
            ) : null}
          </AnimatePresence>
        </LayoutGroup>

        <p className="mt-4 text-center text-sm font-medium text-deep/80">
          {t('Precios en pesos mexicanos. ', 'Prices in Mexican pesos. ')}
          {mt.notas.facturacion}
        </p>
      </div>
    </section>
  )
}
