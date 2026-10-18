import { AnimatePresence, motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import logo from '../assets/logo-marlin-256.webp'
import { CloseIcon, MinusIcon, PlusIcon, WhatsAppIcon } from '../components/icons'
import { getFocusable, lockBodyScroll } from '../components/navbar/shared'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { useMenuText } from '../i18n/menuText'
import { useMesaParam } from '../lib/hooks'
import { formatMXN } from '../lib/menu'
import { lineSubtotal } from '../lib/lines'
import { EASE } from '../lib/motion'
import { buildOrderMessage, openWhatsApp, type OrderMode } from '../lib/whatsapp'
import { useCart } from '../store/cart'
import PopOutCrew from './fx/PopOutCrew'
import { VIDEOS } from './media'
import { BgVideo, Eyebrow, RevealTitle } from './primitives'

const Payment = lazy(() => import('../sections/Payment'))

type ModeChoice = 'local' | 'llevar' | 'mesa'

/** Extras para la cocina: el texto en español es el que viaja en el mensaje de WhatsApp. */
const EXTRAS = [
  { id: 'cebolla', es: 'Sin cebolla', en: 'No onion' },
  { id: 'limon', es: 'Extra limón', en: 'Extra lime' },
  { id: 'salsa', es: 'Salsa aparte', en: 'Sauce on the side' },
  { id: 'cubiertos', es: 'Con cubiertos', en: 'Cutlery please' },
] as const

type ExtraId = (typeof EXTRAS)[number]['id']

/**
 * Pega cantidad y unidad con un espacio duro ("200 g", "9 pzas") para que la unidad no quede
 * sola en el renglón del celular. Sólo para mostrar: el mensaje que se envía no cambia.
 */
const glueUnits = (text: string) => text.replace(/(\d) (g|kg|ml|l|pzas?|piezas?)\b/gi, '$1\u00A0$2')

/** Letra de máquina de escribir para la libreta de extras. */
const TYPEWRITER = "'Courier New', Courier, 'Nimbus Mono PS', ui-monospace, monospace"

/** Ficha de pago por transferencia en una ventana (reutiliza la sección de pago). */
export function PaymentDialog({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unlock = lockBodyScroll()
    const opener = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab' && ref.current) {
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
    return () => {
      document.removeEventListener('keydown', onKey)
      unlock()
      opener?.focus?.()
    }
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={t('Ficha de pago por transferencia', 'Bank transfer details')}
      className="fixed inset-0 z-[80] overflow-y-auto bg-deep"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ duration: 0.6, ease: EASE }}
      data-lenis-prevent
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('Cerrar ficha de pago', 'Close payment details')}
        className="fixed top-4 right-4 z-10 grid size-12 place-items-center rounded-full border border-white/20 bg-night/70 text-foam backdrop-blur-md hover:bg-night"
      >
        <CloseIcon className="size-5" />
      </button>
      <Suspense fallback={<p className="p-10 text-foam/80">…</p>}>
        <Payment />
      </Suspense>
    </motion.div>
  )
}

/** Borde dentado de ticket (arriba o abajo). */
function Zigzag({ flip = false }: { flip?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 8" preserveAspectRatio="none" className={`block h-2 w-full text-[#fffdf7] ${flip ? 'rotate-180' : ''}`}>
      <path fill="currentColor" d="M0 8 L5 0 L10 8 L15 0 L20 8 L25 0 L30 8 L35 0 L40 8 L45 0 L50 8 L55 0 L60 8 L65 0 L70 8 L75 0 L80 8 L85 0 L90 8 L95 0 L100 8 L105 0 L110 8 L115 0 L120 8 L125 0 L130 8 L135 0 L140 8 L145 0 L150 8 L155 0 L160 8 L165 0 L170 8 L175 0 L180 8 L185 0 L190 8 L195 0 L200 8 Z" />
    </svg>
  )
}

/** Íconos de trazo a mano para las fichas de "¿Cómo lo quieres?". */
function ModeIcon({ id, mesa }: { id: ModeChoice; mesa: number | null }) {
  const common = {
    'aria-hidden': true,
    viewBox: '0 0 40 40',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'size-9 sm:size-10',
  }
  if (id === 'llevar') {
    // Bolsa de papel con asas y una ola estampada
    return (
      <svg {...common}>
        <path d="M9.2 14.3c7.3-.4 14.5-.3 21.7.1l-1.6 19.2c-.1 1.1-.9 1.8-2 1.8-4.6.2-9.2.2-13.8 0-1.1 0-1.9-.8-2-1.8L9.2 14.3z" />
        <path d="M9.6 18.2c7 .3 13.9.2 20.9-.2" strokeWidth={1.1} opacity={0.55} />
        <path d="M15.1 17.6c-.3-2.6-.1-5.2 1.1-7 1.6-2.4 5.1-2.6 6.9-.4 1.4 1.7 1.7 4.4 1.6 7.4" />
        <path d="M14.6 27.1c1.7-1.4 3.6-1.5 5.3-.2 1.8 1.4 3.7 1.3 5.4-.1" />
      </svg>
    )
  }
  if (id === 'mesa') {
    // Mesa con su tarjetita de número
    return (
      <svg {...common}>
        <path d="M4.6 30.4c10.3-.5 20.6-.4 30.8.1" />
        <path d="M9.3 30.6l-.6 6.1M30.8 30.6l.5 6.1" />
        <path d="M12.6 30.2l3.6-17.7c2.6-.3 5.1-.3 7.7.1l3.4 17.5" />
        <text
          x="20.1"
          y="26.4"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          style={{ fontFamily: "'Oswald', 'Arial Narrow', sans-serif", fontSize: mesa !== null && mesa > 9 ? 8.5 : 10.5, fontWeight: 600 }}
        >
          {mesa ?? ''}
        </text>
      </svg>
    )
  }
  // Plato con tenedor y cuchillo
  return (
    <svg {...common}>
      <path d="M19.4 9.7c6-.4 11 4.2 11.1 10.1.2 5.9-4.4 10.6-10.4 10.7-5.9.1-10.6-4.4-10.7-10.2-.1-5 3.4-9.3 8.3-10.3" />
      <path d="M20.3 13.9c3.4.1 6.1 2.8 6 6.2-.1 3.4-2.9 6-6.3 5.9-3.4-.1-6-2.9-5.9-6.2.1-2.4 1.5-4.4 3.6-5.3" strokeWidth={1.2} opacity={0.7} />
      <path d="M3.6 8.3l.1 6.2M5.6 8.1v6.4M7.6 8.3l-.1 6.2" />
      <path d="M3.7 14.5c0 1.7.8 2.6 1.9 2.6s1.9-.9 1.9-2.6M5.6 17.1c-.1 5-.1 10 .1 15" />
      <path d="M35.7 8.2c-2 2.6-2.6 6.2-2.2 9.6l2.3.2c-.1 4.7-.1 9.4.1 14.1" />
    </svg>
  )
}

/** Ficha cuadrada (radio) con ícono y punto de seleccionado. */
function ModeTile({
  id,
  label,
  checked,
  mesa,
  name,
  onSelect,
}: {
  id: ModeChoice
  label: string
  checked: boolean
  mesa: number | null
  name: string
  onSelect: () => void
}) {
  return (
    <label
      className={`group/tile relative flex aspect-square w-[calc((100%-1.25rem)/3)] max-w-[7rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 px-1 text-center max-sm:aspect-auto max-sm:min-h-[6.5rem] max-sm:max-w-[9rem] max-sm:flex-1 transition-[translate] duration-300 ease-coast has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sunset ${
        checked ? '-translate-y-0.5 border-transparent text-deep' : 'border-ink/15 text-ink/75 hover:border-ink/40'
      }`}
    >
      <input type="radio" name={name} value={id} checked={checked} onChange={onSelect} className="sr-only" />
      {/* Marco de seleccionado: sólo cambia opacidad y escala */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-0.5 rounded-2xl border-2 border-deep bg-white shadow-[0_12px_22px_-12px_rgb(19_50_74/0.6)] transition-[opacity,scale] duration-300 ease-coast ${
          checked ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      />
      <span
        aria-hidden="true"
        className={`absolute top-1.5 left-1.5 grid size-[18px] place-items-center rounded-full border-2 transition-[opacity,scale] duration-300 ease-coast ${
          checked
            ? 'scale-100 border-sunset-deep bg-sunset-deep opacity-100'
            : 'scale-50 border-ink/35 bg-transparent opacity-0 group-hover/tile:scale-100 group-hover/tile:opacity-100'
        }`}
      >
        <svg viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`size-2.5 ${checked ? 'opacity-100' : 'opacity-0'}`}>
          <path d="M2.6 6.3l2.2 2.1 4.6-4.8" />
        </svg>
      </span>
      <span className={`relative transition-[scale] duration-300 ease-coast ${checked ? 'scale-105 text-sunset-deep' : 'scale-100'}`}>
        <ModeIcon id={id} mesa={mesa} />
      </span>
      <span className="relative text-xs leading-tight font-semibold">{label}</span>
    </label>
  )
}

/** Casilla de libreta: círculo rellenado a mano y raya de pluma sobre el texto. */
function ExtraCheck({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="group/extra relative flex min-h-11 cursor-pointer items-center gap-3 rounded-md pr-2 pl-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-sunset">
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span aria-hidden="true" className="relative size-6 shrink-0">
        {/* Relleno a mano (crece desde el centro, con un giro corto) */}
        <svg
          viewBox="0 0 24 24"
          className={`absolute inset-0 size-full origin-center transition-[opacity,scale,rotate] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            checked ? 'scale-100 rotate-0 opacity-100' : 'scale-25 -rotate-45 opacity-0'
          }`}
        >
          <path fill="#E8552B" d="M12.4 4.8c4-.2 7.2 3 7 7.2-.1 3.9-3.4 7.1-7.5 7-3.9-.1-6.9-3.3-6.8-7.2.2-3.9 3.3-6.9 7.3-7z" />
          <path fill="none" stroke="#A9391A" strokeWidth={1.2} strokeLinecap="round" opacity={0.45} d="M7.4 10.2l7.9-4M6.2 13.4l11.6-6M6.9 16.3l11.4-6.1M9.4 18.2l8.4-4.6" />
        </svg>
        {/* Aro dibujado a pluma */}
        <svg viewBox="0 0 24 24" fill="none" className="absolute inset-0 size-full text-ink/55 transition-opacity group-hover/extra:text-ink/80">
          <path stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" d="M11 2.9c5.5-.7 10.3 3.4 10.4 8.9.1 5.3-4.1 9.6-9.4 9.6-5.3.1-9.6-4-9.6-9.2C2.3 7.3 5.9 3.6 10.3 3c1.3-.1 2.5 0 3.5.4" />
        </svg>
      </span>
      <span className="relative inline-block min-w-0">
        <span
          className={`block text-[15px] leading-tight font-bold text-ink transition-opacity duration-300 ${checked ? 'opacity-75' : 'opacity-100'}`}
          style={{ fontFamily: TYPEWRITER }}
        >
          {label}
        </span>
        {/* Raya de pluma: se dibuja de izquierda a derecha (scaleX) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          fill="none"
          className={`pointer-events-none absolute top-1/2 -left-1 h-2.5 w-[calc(100%+0.75rem)] origin-left -translate-y-1/2 transition-[scale] ease-[cubic-bezier(0.65,0,0.35,1)] ${
            checked ? 'scale-x-100 delay-150 duration-[380ms]' : 'scale-x-0 delay-0 duration-200'
          }`}
        >
          <path stroke="#C4441E" strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" d="M1 6.4C11 4.6 21 6.9 32 5.5s22 1.4 33-.3 22 1.1 34-.9" />
        </svg>
      </span>
    </label>
  )
}

/**
 * "Tu comanda": lo que agregas de la carta aparece en un ticket impreso; a un lado, el teléfono
 * muestra exactamente el mensaje de WhatsApp que se enviará (en español, para el restaurante).
 */
export default function OrderSection() {
  const { t, lang } = useLang()
  const mt = useMenuText()
  const mesa = useMesaParam()
  const { lines, count, total, hasPerKilo, increment, decrement, clear } = useCart()
  const [choice, setChoice] = useState<ModeChoice>(mesa ? 'mesa' : 'local')
  const [notas, setNotas] = useState('')
  const [extras, setExtras] = useState<ExtraId[]>([])
  const [nombre, setNombre] = useState('')
  const [sent, setSent] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [isTouch] = useState(() => {
    try {
      return window.matchMedia('(hover: none)').matches
    } catch {
      return false
    }
  })
  // En el celular el ticket es alto: con menos inclinación sus esquinas no tocan la orilla.
  const [narrow] = useState(() => {
    try {
      return window.matchMedia('(max-width: 639px)').matches
    } catch {
      return false
    }
  })
  const notesId = useId()
  const nameId = useId()
  const modeName = useId()
  const extrasHintId = useId()
  const ref = useRef<HTMLElement>(null)
  const sendRef = useRef<HTMLButtonElement>(null)
  const sendInView = useInView(sendRef, { amount: 0.6 })
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%'])
  const phoneY = useTransform(scrollYProgress, [0, 1], ['10%', '-10%'])

  useEffect(() => {
    if (mesa) setChoice('mesa')
  }, [mesa])

  const toggleExtra = (id: ExtraId) => setExtras((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]))

  // Los extras viajan en español, en el orden de la lista, antes de la nota escrita
  const extrasText = EXTRAS.filter((e) => extras.includes(e.id))
    .map((e) => e.es)
    .join(', ')
  const notasCompletas = [extrasText, notas.trim()].filter(Boolean).join(', ')

  const mode: OrderMode = choice === 'mesa' && mesa ? { tipo: 'mesa', mesa } : choice === 'llevar' ? { tipo: 'llevar' } : { tipo: 'local' }
  const message = count > 0 ? buildOrderMessage({ lines, mode, notas: notasCompletas, nombre }) : ''
  const now = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', { timeZone: SITE.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date())
  const crewActive = Boolean(message) && isTouch && sendInView

  const itemsLabel = `${count} ${t(count === 1 ? 'platillo' : 'platillos', count === 1 ? 'item' : 'items')}`

  const modes: { id: ModeChoice; label: string }[] = [
    { id: 'local', label: t('Para comer aquí', 'Dine in') },
    { id: 'llevar', label: t('Para llevar', 'Takeout') },
    ...(mesa ? [{ id: 'mesa' as const, label: `${t('Mesa', 'Table')} ${mesa}` }] : []),
  ]

  const send = () => {
    openWhatsApp(message)
    setSent(true)
  }

  return (
    <section ref={ref} id="pedir" aria-labelledby="pedir-title" className="relative isolate overflow-hidden bg-night px-5 py-20 text-foam sm:px-8 sm:py-28 md:py-36">
      <motion.div aria-hidden="true" className="absolute -inset-y-[12%] inset-x-0 -z-10" style={reduce ? undefined : { y: bgY }}>
        <BgVideo video={VIDEOS.sunset} />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-night via-night/70 to-night" />

      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <Eyebrow tone="light">{t('Pedidos por WhatsApp', 'Order on WhatsApp')}</Eyebrow>
          <RevealTitle
            id="pedir-title"
            text={t('Tu comanda,\n*directo a WhatsApp*', 'Your order,\n*straight to WhatsApp*')}
            className="mt-6 font-display text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.025em]"
            accentClassName="italic text-gold"
          />
          <p className="mt-6 text-lg text-foam/85">
            {t('Lo que agregas del menú se apunta aquí.', 'Everything you add from the menu is written down here.')}{' '}
            {/* En el celular el teléfono queda abajo del ticket, no a la derecha */}
            <span className="lg:hidden">{t('Abajo ves el mensaje', 'Below you see the exact message')}</span>
            <span className="max-lg:hidden">{t('A la derecha ves el mensaje', 'On the right you see the exact message')}</span>{' '}
            {t('tal cual nos llega; confirmamos precio y disponibilidad por ahí.', 'we receive; we confirm price and availability there.')}
          </p>
        </div>

        <div className="mt-12 grid items-start gap-12 sm:mt-14 lg:grid-cols-[1fr_auto] lg:gap-20">
          {/* Ticket */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotate: narrow ? -1 : -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: narrow ? -0.4 : -1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1, ease: EASE }}
            className="mx-auto w-full max-w-xl drop-shadow-[0_40px_60px_rgb(0_0_0/0.55)]"
          >
            <Zigzag />
            <div className="bg-[#fffdf7] px-6 py-7 font-mono text-[13px] text-ink sm:px-9">
              <div className="flex items-center justify-between gap-4 border-b border-dashed border-ink/30 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <img src={logo} alt="" width={40} height={40} className="size-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-banner text-base font-semibold tracking-[0.18em] whitespace-nowrap uppercase max-sm:tracking-[0.14em]">Mariscos Carlos</p>
                    <p className="text-[11px] text-ink/70 max-sm:mt-0.5">
                      {t('Comanda', 'Order ticket')} · {now}
                      <span className="sm:hidden">
                        {' · '}
                        {itemsLabel}
                      </span>
                    </p>
                  </div>
                </div>
                <p className="text-right text-[11px] whitespace-nowrap text-ink/70 max-sm:hidden">{itemsLabel}</p>
              </div>

              {count === 0 ? (
                <div className="py-10 text-center">
                  <p className="font-display text-2xl text-deep not-italic">{t('Tu comanda está vacía', 'Your order is empty')}</p>
                  <p className="mx-auto mt-2 max-w-xs font-sans text-sm text-ink/70">
                    {t('Abre el menú y toca + en lo que se te antoje.', 'Open the menu and tap + on anything you like.')}
                  </p>
                  <a href="#menu" className="mt-5 inline-flex h-11 items-center rounded-full bg-deep px-6 font-sans text-sm font-semibold text-foam hover:bg-sunset-deep">
                    {t('Abrir el menú', 'Open the menu')}
                  </a>
                </div>
              ) : (
                <ul className="divide-y divide-dashed divide-ink/20">
                  <AnimatePresence initial={false}>
                    {lines.map((line) => {
                      const subtotal = lineSubtotal(line)
                      return (
                        <motion.li
                          key={line.key}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2.5 py-3.5 sm:flex sm:items-center sm:gap-3 sm:py-3"
                        >
                          <div className="flex items-center gap-1 max-sm:col-span-2 max-sm:row-start-2">
                            <button
                              type="button"
                              onClick={() => decrement(line.key)}
                              aria-label={`${t('Quitar uno de', 'Remove one')} ${mt.lineTitle(line)}`}
                              className="relative grid size-10 place-items-center rounded-full border border-ink/20 after:absolute after:-inset-0.5 after:rounded-full hover:bg-ink/5 sm:size-8 sm:after:hidden"
                            >
                              <MinusIcon className="size-4 sm:size-3.5" />
                            </button>
                            <span className="w-8 text-center text-[15px] font-bold tabular-nums sm:w-6 sm:text-[13px]" aria-live="polite">
                              {line.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => increment(line.key)}
                              aria-label={`${t('Agregar uno más de', 'Add one more')} ${mt.lineTitle(line)}`}
                              className="relative grid size-10 place-items-center rounded-full border border-ink/20 after:absolute after:-inset-0.5 after:rounded-full hover:bg-ink/5 sm:size-8 sm:after:hidden"
                            >
                              <PlusIcon className="size-4 sm:size-3.5" />
                            </button>
                          </div>
                          <p className="min-w-0 flex-1 leading-snug max-sm:text-[14px]">{glueUnits(mt.lineTitle(line))}</p>
                          <p className="shrink-0 text-right font-bold tabular-nums max-sm:text-[14px]">
                            {subtotal === null ? (lang === 'en' ? 'per kg' : (line.precioTexto ?? '')) : formatMXN(subtotal)}
                          </p>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}

              {count > 0 ? (
                <>
                  <div className="mt-2 flex items-baseline justify-between border-t-2 border-ink pt-4">
                    <span className="font-sans text-xs font-semibold tracking-[0.2em] uppercase">{t('Total estimado', 'Estimated total')}</span>
                    <span className="font-display text-3xl not-italic">
                      {formatMXN(total)}
                      {hasPerKilo ? <span className="text-base"> + kg</span> : null}
                    </span>
                  </div>

                  <fieldset className="mt-7 font-sans">
                    <legend className="mb-3 text-xs font-semibold tracking-[0.2em] text-ink/75 uppercase">{t('¿Cómo lo quieres?', 'How do you want it?')}</legend>
                    <div className="flex flex-wrap gap-2.5 pt-0.5">
                      {modes.map((m) => (
                        <ModeTile key={m.id} id={m.id} label={m.label} checked={choice === m.id} mesa={mesa} name={modeName} onSelect={() => setChoice(m.id)} />
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="mt-7 font-sans" aria-describedby={extrasHintId}>
                    <legend className="float-left mb-2 text-xs leading-5 font-semibold tracking-[0.2em] text-ink/75 uppercase">Extras</legend>
                    <p id={extrasHintId} className="float-right mb-2 text-[11px] leading-5 text-ink/70">
                      {t('Se anotan en el mensaje', 'Added to your message')}
                    </p>
                    {/* Hojita de libreta: renglones azules y margen rojo */}
                    <div className="relative clear-both overflow-hidden rounded-lg border border-ink/10 bg-[#fdfaf1] bg-[repeating-linear-gradient(to_bottom,transparent_0_39px,rgb(28_124_156/0.24)_39px_40px,transparent_40px_44px)] py-1 pr-2 pl-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.8)]">
                      <span aria-hidden="true" className="absolute inset-y-0 left-3 w-px bg-sunset/45" />
                      <div className="grid sm:grid-cols-2 sm:gap-x-4">
                        {EXTRAS.map((e) => (
                          <ExtraCheck key={e.id} label={t(e.es, e.en)} checked={extras.includes(e.id)} onToggle={() => toggleExtra(e.id)} />
                        ))}
                      </div>
                    </div>
                  </fieldset>

                  <div className="mt-6 grid gap-4 font-sans sm:grid-cols-2">
                    <div>
                      <label htmlFor={nameId} className="text-xs font-semibold tracking-[0.2em] text-ink/75 uppercase">
                        {t('Nombre (opcional)', 'Name (optional)')}
                      </label>
                      <input
                        id={nameId}
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        maxLength={60}
                        autoComplete="name"
                        className="mt-1.5 h-11 w-full rounded-xl border border-ink/20 bg-white px-3 text-base"
                      />
                    </div>
                    <div>
                      <label htmlFor={notesId} className="text-xs font-semibold tracking-[0.2em] text-ink/75 uppercase">
                        {t('Otra nota', 'Other note')}
                      </label>
                      <input
                        id={notesId}
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        maxLength={200}
                        placeholder={t('Ej. poco picante', 'e.g. mild, please')}
                        className="mt-1.5 h-11 w-full rounded-xl border border-ink/20 bg-white px-3 text-base placeholder:text-ink/60"
                      />
                    </div>
                  </div>
                  <p className="mt-5 font-sans text-[13px] text-ink/75 sm:text-xs">
                    {t('El total es estimado. Confirmamos precio y disponibilidad por WhatsApp.', 'The total is an estimate. We confirm price and availability on WhatsApp.')}
                    {hasPerKilo ? ` ${t('Los productos por kilo se cobran según el peso.', 'Per-kg items are charged by weight.')}` : ''}
                  </p>
                </>
              ) : null}
            </div>
            <Zigzag flip />
          </motion.div>

          {/* Teléfono con el mensaje real */}
          <motion.div className="mx-auto w-[280px] max-lg:transform-none! sm:w-[320px]" style={reduce ? undefined : { y: phoneY }}>
            <div className="relative rounded-[3rem] bg-linear-to-br from-[#FBFCFD] via-[#D3D8DE] to-[#F1F3F6] p-[6px] shadow-[0_50px_80px_-30px_rgb(0_0_0/0.8)]">
              <div className="overflow-hidden rounded-[2.6rem] bg-[#16191D] p-[3px]">
                <div className={`flex ${message ? 'h-[480px]' : 'h-[300px]'} flex-col overflow-hidden rounded-[2.4rem] bg-[#EFE5D3] transition-[height] duration-500 sm:h-[560px]`}>
                  <div className="flex items-center gap-2.5 bg-[#0B5E55] px-4 pt-6 pb-3 text-white">
                    <span className="grid size-9 place-items-center rounded-full bg-foam">
                      <img src={logo} alt="" className="size-7" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-sm font-semibold">{SITE.nombre}</span>
                      <span className="block text-[11px] text-white/80">{SITE.whatsapp.display}</span>
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden bg-[radial-gradient(rgb(19_50_74/0.07)_1px,transparent_1.4px)] bg-size-[13px_13px] p-3">
                    <AnimatePresence mode="popLayout">
                      {message ? (
                        <motion.div
                          key="msg"
                          layout
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="max-h-full self-end overflow-y-auto rounded-xl rounded-tr-sm bg-[#D9FDD3] px-3 py-2 text-[12px] leading-snug whitespace-pre-line text-ink shadow-sm"
                        >
                          {glueUnits(message)}
                          <span className="mt-1 block text-right text-[10px] text-ink/60">{now}</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="self-center rounded-lg bg-white/80 px-3 py-2 text-center text-[11px] text-ink/70"
                        >
                          {t('Aquí verás tu mensaje antes de enviarlo', 'Your message will appear here before you send it')}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-2 bg-[#EFE5D3] px-3 pt-1 pb-5">
                    <span className="flex h-10 flex-1 items-center rounded-full bg-white px-4 text-xs text-ink/60">
                      {t('Mensaje', 'Message')}
                    </span>
                    <motion.button
                      type="button"
                      disabled={!message}
                      whileTap={{ scale: 0.9 }}
                      onClick={send}
                      aria-label={t('Enviar pedido por WhatsApp', 'Send order on WhatsApp')}
                      className="grid size-11 place-items-center rounded-full bg-[#0B8F74] text-white disabled:opacity-40"
                    >
                      <WhatsAppIcon className="size-5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
            <motion.button
              ref={sendRef}
              type="button"
              disabled={!message}
              whileTap={{ scale: 0.97 }}
              onClick={send}
              className="group relative mt-12 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-sunset-deep font-semibold text-white shadow-[0_14px_30px_-12px_rgb(196_68_30/0.8)] transition-colors hover:bg-sunset-darker disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-foam/70 disabled:shadow-none"
            >
              {message ? <PopOutCrew active={crewActive} /> : null}
              <WhatsAppIcon className="relative size-5" />
              <span className="relative">{t('Enviar por WhatsApp', 'Send on WhatsApp')}</span>
            </motion.button>
            <AnimatePresence>
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-foam/90"
                  role="status"
                >
                  {t('Abrimos WhatsApp con tu pedido. Cuando lo envíes, te confirmamos por ahí.', 'We opened WhatsApp with your order. Once you send it, we confirm there.')}
                  <button
                    type="button"
                    onClick={() => {
                      clear()
                      setExtras([])
                      setSent(false)
                    }}
                    className="mt-2 block font-semibold text-gold underline-offset-4 hover:underline"
                  >
                    {t('Vaciar comanda', 'Clear order')}
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="mt-4 block w-full text-center text-sm font-semibold text-balance text-foam/85 underline-offset-4 hover:text-foam hover:underline"
            >
              {t('¿Pagas por transferencia? Ver ficha de pago', 'Paying by bank transfer? See payment details')}
            </button>
          </motion.div>
        </div>
      </div>

      {/* En <body>: dentro de la sección (isolate) la ficha quedaba debajo del header, la barra rápida y la sección siguiente. */}
      {createPortal(<AnimatePresence>{payOpen ? <PaymentDialog onClose={() => setPayOpen(false)} /> : null}</AnimatePresence>, document.body)}
    </section>
  )
}
