import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { SITE } from '../../config/site'
import { useLang } from '../../i18n/lang'
import { useMenuText } from '../../i18n/menuText'
import { formatClock, useMesaParam } from '../../lib/hooks'
import { buttonTap, EASE } from '../../lib/motion'
import { useCart } from '../../store/cart'
import { ORDER_STATUSES, STATUS_LABEL, useOrdersByMesa, type Order, type OrderStatus } from '../../store/orders'
import { ArrowRightIcon, CheckIcon, ChevronDownIcon, CloseIcon, InfoIcon } from '../icons'
import { OrderProgress } from './OrderProgress'

const STATUS_DOT: Record<OrderStatus, string> = {
  pendiente: 'bg-gold',
  preparacion: 'bg-[#5FC3E4]',
  listo: 'bg-emerald-400',
}

const STATUS_LABEL_EN: Record<OrderStatus, string> = {
  pendiente: 'Received',
  preparacion: 'Being prepared',
  listo: 'Ready',
}

/** "2 × Aguachile, 1 × Cerveza y 2 más" */
function itemSummary(order: Order, en = false, itemName: (l: Order['items'][number]) => string = (l) => l.nombre): string {
  if (order.items.length === 0) return en ? 'No dishes' : 'Sin platillos'
  const shown = order.items.slice(0, 2).map((l) => `${l.cantidad} × ${itemName(l)}`)
  const rest = order.items.length - shown.length
  return rest > 0 ? `${shown.join(', ')} ${en ? 'and' : 'y'} ${rest} ${en ? 'more' : 'más'}` : shown.join(', ')
}

/** Hora corta: "14:35" en español, "2:35 PM" en inglés. */
function clock(timestamp: number, en: boolean): string {
  if (!en) return formatClock(timestamp)
  return new Intl.DateTimeFormat('en-US', { timeZone: SITE.timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(timestamp),
  )
}

/**
 * Panel flotante con el estado de los pedidos de la mesa (?mesa=N) en la página de inicio.
 * Abajo a la izquierda, sin tapar el botón del carrito (abajo a la derecha).
 */
export default function TableStatusPanel() {
  const mesa = useMesaParam()
  const orders = useOrdersByMesa(mesa)
  const { lang, t } = useLang()
  const en = lang === 'en'
  const mt = useMenuText()
  const reduceMotion = useReducedMotion()
  const [expanded, setExpanded] = useState(false)
  /** Pedidos que pasaron a "listo" mientras el panel estaba cerrado (aviso pendiente de ver). */
  const [readyIds, setReadyIds] = useState<string[]>([])
  const [announcement, setAnnouncement] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const previousStatuses = useRef<Map<string, OrderStatus> | null>(null)
  const panelId = useId()
  const headingId = useId()

  // Detecta pedidos de esta mesa que acaban de pasar a "listo".
  useEffect(() => {
    if (mesa === null) {
      previousStatuses.current = null
      return
    }
    const previous = previousStatuses.current
    previousStatuses.current = new Map(orders.map((o) => [o.id, o.status]))
    if (!previous) return
    const becameReady = orders.filter((o) => {
      const before = previous.get(o.id)
      return o.status === 'listo' && before !== undefined && before !== 'listo'
    })
    if (becameReady.length === 0) return
    setAnnouncement(
      becameReady.length === 1
        ? t(`Mesa ${mesa}: ¡tu pedido ${becameReady[0].id} está listo!`, `Table ${mesa}: your order ${becameReady[0].id} is ready!`)
        : t(`Mesa ${mesa}: ¡${becameReady.length} pedidos están listos!`, `Table ${mesa}: ${becameReady.length} orders are ready!`),
    )
    if (!expanded) setReadyIds((prev) => [...prev, ...becameReady.map((o) => o.id)])
  }, [orders, mesa, expanded, t])

  // El aviso "¡Listo!" sólo vale mientras alguno de esos pedidos siga listo
  // (si cocina lo regresa o lo entrega, el botón vuelve a mostrar el estado real).
  const attention = readyIds.some((id) => orders.some((o) => o.id === id && o.status === 'listo'))

  // Si se abre el carrito, el panel se cierra para no quedar abierto debajo del modal.
  const { isOpen: cartOpen } = useCart()
  useEffect(() => {
    if (cartOpen) setExpanded(false)
  }, [cartOpen])

  const collapse = useCallback((restoreFocus: boolean) => {
    setExpanded(false)
    if (restoreFocus) buttonRef.current?.focus()
  }, [])

  // Escape cierra; un toque fuera del panel también.
  useEffect(() => {
    if (!expanded) return
    const onKey = (event: KeyboardEvent) => {
      // Con un modal abierto (carrito, menú móvil), Escape le pertenece al modal.
      if (event.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return
      collapse(true)
    }
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && event.target instanceof Node && !rootRef.current.contains(event.target)) collapse(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [expanded, collapse])

  if (mesa === null) return null

  const latest = orders[0]
  const latestStep = latest ? ORDER_STATUSES.indexOf(latest.status) : -1
  const statusText = attention
    ? t('¡Listo!', 'Ready!')
    : latest
      ? en
        ? STATUS_LABEL_EN[latest.status]
        : STATUS_LABEL[latest.status]
      : t('Sin pedidos', 'No orders')

  const toggle = () => {
    setExpanded((open) => !open)
    setReadyIds([])
  }

  const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
  const shown = reduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 max-md:bottom-[calc(5.75rem+env(safe-area-inset-bottom))]"
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={{ duration: 0.45, ease: EASE }}
            className="absolute bottom-full left-0 mb-3 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-deep/10 bg-foam/95 shadow-[0_24px_60px_-28px_rgb(19_50_74/0.65)] backdrop-blur-md"
          >
            <div className="max-h-[min(65svh,30rem)] overflow-y-auto overscroll-contain p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-[0.16em] text-ocean-deep uppercase">{t('Estado de tu mesa', 'Your table status')}</p>
                  <h2 id={headingId} className="mt-1 font-display text-2xl leading-tight text-deep">
                    {t('Mesa', 'Table')} <em className="italic">{mesa}</em>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => collapse(true)}
                  aria-label={t(`Cerrar estado de la Mesa ${mesa}`, `Close Table ${mesa} status`)}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-deep transition-colors hover:bg-deep/5"
                >
                  <CloseIcon className="size-5" />
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-deep/20 bg-white/60 p-4 text-sm text-deep/80">
                  <p className="font-semibold text-deep">
                    {t(`Aún no hay pedidos registrados para la Mesa ${mesa}.`, `No orders have been placed for Table ${mesa} yet.`)}
                  </p>
                  <p className="mt-1.5">
                    {t(
                      'Cuando tu mesero registre tu pedido, aquí verás si está pendiente, en preparación o listo.',
                      'Once your server enters your order, you’ll see here whether it’s received, being prepared or ready.',
                    )}
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {orders.map((order) => {
                    const ready = order.status === 'listo'
                    return (
                      <li
                        key={order.id}
                        className={`rounded-2xl border p-4 transition-colors duration-500 ${
                          ready ? 'border-emerald-700/30 bg-emerald-50' : 'border-deep/10 bg-white/80'
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate text-sm font-semibold text-deep">
                            {t('Pedido', 'Order')} <span className="font-mono">{order.id}</span>
                          </p>
                          <p className="shrink-0 text-xs text-deep/75">
                            {ready && order.listoEn ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
                                <CheckIcon className="size-3.5" />
                                {t('Listo', 'Ready')} {clock(order.listoEn, en)}
                              </span>
                            ) : (
                              <>{t('Pedido', 'Ordered')} {clock(order.creadoEn, en)}</>
                            )}
                          </p>
                        </div>
                        <div className="mt-3">
                          <OrderProgress status={order.status} size="sm" />
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-deep/80">{itemSummary(order, en, (l) => mt.itemName({ id: l.itemId, nombre: l.nombre }))}</p>
                        <Link
                          to={`/pedido/${order.id}`}
                          className="mt-1 -ml-1 inline-flex h-10 items-center gap-1.5 rounded-full px-1 text-sm font-semibold text-ocean-deep underline-offset-4 hover:underline"
                        >
                          {t('Ver detalle del pedido', 'View order details')}
                          <ArrowRightIcon className="size-4" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}

              <p className="mt-4 flex gap-2 text-xs text-deep/75">
                <InfoIcon className="size-4 shrink-0" />
                <span>
                  {t(
                    'Demo: los pedidos se registran desde /mesero y sólo existen en este navegador.',
                    'Demo: orders are entered from /mesero and only exist in this browser.',
                  )}
                </span>
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        whileTap={buttonTap}
        animate={attention ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={`flex h-12 max-w-[calc(100vw-14.5rem)] items-center gap-2 rounded-full pr-3.5 pl-3 text-left sm:gap-2.5 sm:pr-4 sm:pl-3.5 shadow-[0_14px_30px_-14px_rgb(19_50_74/0.7)] transition-colors duration-300 sm:max-w-xs ${
          attention ? 'bg-gold text-deep ring-4 ring-gold/45' : 'bg-deep text-foam hover:bg-deep/95'
        }`}
      >
        {latest && !attention ? (
          // Barra de progreso compacta (Pendiente → En preparación → Listo); el texto ya da el estado.
          <span aria-hidden="true" className="flex shrink-0 gap-0.5">
            {ORDER_STATUSES.map((s, i) => (
              <span
                key={s}
                className={`h-1.5 w-2.5 rounded-full transition-colors duration-500 ${
                  i <= latestStep ? STATUS_DOT[latest.status] : 'bg-foam/25'
                }`}
              />
            ))}
          </span>
        ) : (
          <span
            aria-hidden="true"
            className={`size-2.5 shrink-0 rounded-full ${attention ? 'bg-emerald-700' : 'bg-foam/50'}`}
          />
        )}
        <span className="flex min-w-0 flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-1.5">
          <span className={`truncate text-[11px] font-semibold tracking-wide uppercase sm:text-sm sm:tracking-normal sm:normal-case ${attention ? 'text-deep' : 'text-foam/80 sm:text-foam'}`}>
            {t('Mesa', 'Table')} {mesa}
          </span>
          <span className="sr-only"> · </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span className="truncate text-[13px] font-semibold sm:text-sm">{statusText}</span>
        </span>
        {orders.length > 1 ? (
          <span
            className={`hidden shrink-0 rounded-full px-1.5 text-xs font-bold sm:inline ${attention ? 'bg-deep/10' : 'bg-white/15'}`}
          >
            {orders.length}
            <span className="sr-only">{t(' pedidos', ' orders')}</span>
          </span>
        ) : null}
        <ChevronDownIcon
          className={`hidden size-4 shrink-0 transition-transform duration-300 sm:block ${expanded ? '' : 'rotate-180'}`}
        />
      </motion.button>
    </div>
  )
}
