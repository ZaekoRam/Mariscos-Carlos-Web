import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import logo from '../assets/logo.svg'
import { ArrowLeftIcon, CheckIcon, ChefIcon, ClockIcon, InfoIcon, TableIcon } from '../components/icons'
import { OrderProgress } from '../components/orders/OrderProgress'
import { DemoBanner } from '../components/orders/StaffLayout'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { useMenuText } from '../i18n/menuText'
import { formatClock, formatElapsed, useNow } from '../lib/hooks'
import { hasPerKiloLines, linePriceText, lineSubtotal, linesTotal, totalText, type OrderLine } from '../lib/lines'
import { formatMXN } from '../lib/menu'
import { EASE, fadeUp, staggerContainer, staggerItem } from '../lib/motion'
import { useOrder, type Order, type OrderStatus } from '../store/orders'

const CARD = 'rounded-3xl border border-deep/10 bg-white/70 shadow-[0_18px_40px_-24px_rgb(19_50_74/0.45)]'

const LINK_PRIMARY =
  'inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-sunset-deep px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-10px_rgb(196_68_30/0.7)] transition-[background-color,transform] duration-200 hover:bg-sunset-darker active:scale-[0.97]'

const LINK_SECONDARY =
  'inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-deep/25 bg-white/50 px-6 text-[15px] font-semibold text-deep transition-[background-color,transform] duration-200 hover:bg-white active:scale-[0.97]'

const STATUS_COPY: Record<OrderStatus, { title: string; detail: string }> = {
  pendiente: {
    title: 'Recibimos tu pedido',
    detail: 'Ya está en la cocina. En un momento empezamos a prepararlo.',
  },
  preparacion: {
    title: 'Tu pedido se está preparando',
    detail: 'La cocina ya está trabajando en tus platillos.',
  },
  listo: {
    title: '¡Tu pedido ya está listo!',
    detail: 'En un momento llega a tu mesa.',
  },
}

const STATUS_COPY_EN: Record<OrderStatus, { title: string; detail: string }> = {
  pendiente: {
    title: 'We got your order',
    detail: 'It’s already in the kitchen. We’ll start preparing it in a moment.',
  },
  preparacion: {
    title: 'Your order is being prepared',
    detail: 'The kitchen is already working on your dishes.',
  },
  listo: {
    title: 'Your order is ready!',
    detail: 'It’ll be at your table in a moment.',
  },
}

/** Hora corta: "14:35" en español, "2:35 PM" en inglés. */
function clock(timestamp: number, en: boolean): string {
  if (!en) return formatClock(timestamp)
  return new Intl.DateTimeFormat('en-US', { timeZone: SITE.timeZone, hour: 'numeric', minute: '2-digit' }).format(
    new Date(timestamp),
  )
}

/** Versión en inglés de linePriceText: "$480", "$240 each" o "$500 per kg". */
function linePriceTextEn(line: OrderLine): string {
  if (line.precioUnitario === null) return line.precioTexto?.replace(/\s*por kilo\b/i, ' per kg') ?? 'Price per kg'
  if (line.cantidad > 1) return `${formatMXN(line.precioUnitario)} each`
  return formatMXN(line.precioUnitario)
}

/** Versión en inglés de totalText: "$960" o "$960 + per-kg items". */
function totalTextEn(lines: OrderLine[]): string {
  const total = formatMXN(linesTotal(lines))
  return hasPerKiloLines(lines) ? `${total} + per-kg items` : total
}

const STATUS_ICON: Record<OrderStatus, { Icon: typeof ClockIcon; badge: string }> = {
  pendiente: { Icon: ClockIcon, badge: 'bg-gold text-deep' },
  preparacion: { Icon: ChefIcon, badge: 'bg-ocean-deep text-white' },
  listo: { Icon: CheckIcon, badge: 'bg-emerald-700 text-white' },
}

function menuHref(mesa: number | undefined) {
  return mesa ? `/?mesa=${mesa}#menu` : '/#menu'
}

/** Seguimiento del pedido para el cliente: /pedido/:orderId. Se actualiza en vivo. */
export default function Pedido() {
  const { orderId = '' } = useParams()
  const { t } = useLang()
  const order = useOrder(orderId)
  const [lastSeen, setLastSeen] = useState<Order | undefined>(undefined)

  // Recordar el último estado visto: si cocina marca "Entregado" el pedido desaparece del tablero.
  if (order && order !== lastSeen) setLastSeen(order)
  const sameId = lastSeen?.id.toUpperCase() === orderId.toUpperCase()
  const delivered = !order && sameId && lastSeen?.status === 'listo' ? lastSeen : undefined

  const displayId = (order?.id ?? orderId).toUpperCase()

  useEffect(() => {
    const previous = document.title
    document.title = `${t('Pedido', 'Order')} ${displayId} · ${SITE.nombre}`
    return () => {
      document.title = previous
    }
  }, [displayId, t])

  const mesa = order?.mesa ?? delivered?.mesa

  return (
    <div className="flex min-h-svh flex-col bg-sand text-ink">
      <DemoBanner />
      <header className="px-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 py-4">
          <Link to={mesa ? `/?mesa=${mesa}` : '/'} className="flex min-w-0 items-center gap-2.5 rounded-full">
            <img src={logo} alt="" className="size-9 shrink-0" width={36} height={36} />
            <span className="truncate font-display text-xl text-deep">{SITE.nombre}</span>
            <span className="sr-only">{t('— ir al inicio', '— go to home page')}</span>
          </Link>
          <Link
            to={menuHref(mesa)}
            className="inline-flex h-10 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-ocean-deep underline-offset-4 hover:underline"
          >
            {t('Ver menú', 'See menu')}
          </Link>
        </div>
      </header>

      <main id="contenido" tabIndex={-1} className="flex-1 px-4 pt-4 pb-20 outline-none sm:px-6 sm:pt-8">
        <div className="mx-auto max-w-3xl">
          {order ? (
            <FoundOrder order={order} />
          ) : delivered ? (
            <DeliveredOrder order={delivered} />
          ) : (
            <MissingOrder id={displayId} />
          )}
        </div>
      </main>

      <footer className="px-4 pb-8 text-center text-xs text-deep/75 sm:px-6">
        {SITE.nombre} · {SITE.direccion}
      </footer>
    </div>
  )
}

function FoundOrder({ order }: { order: Order }) {
  const now = useNow(15_000)
  const { lang, t } = useLang()
  const en = lang === 'en'
  const { lineTitle } = useMenuText()
  const copy = (en ? STATUS_COPY_EN : STATUS_COPY)[order.status]
  const priceText = (line: OrderLine) => (en ? linePriceTextEn(line) : linePriceText(line))
  const { Icon, badge } = STATUS_ICON[order.status]
  const isReady = order.status === 'listo'
  const totalItems = order.items.reduce((sum, l) => sum + l.cantidad, 0)

  return (
    <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold tracking-[0.18em] text-ocean-deep uppercase">{t('Seguimiento de pedido', 'Order tracking')}</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] break-words text-deep sm:text-5xl">
          {t('Pedido', 'Order')} {order.id}
          <span className="text-sunset-deep italic"> · {t('Mesa', 'Table')} {order.mesa}</span>
        </h1>
      </motion.div>

      <motion.section
        variants={fadeUp}
        aria-labelledby="estado-pedido"
        className={`${CARD} relative overflow-hidden p-6 transition-colors duration-700 sm:p-8 ${
          isReady ? 'border-emerald-700/30 bg-white/90' : ''
        }`}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 -right-24 size-64 rounded-full blur-3xl transition-colors duration-700 ${
            isReady ? 'bg-emerald-400/25' : order.status === 'preparacion' ? 'bg-ocean/15' : 'bg-gold/30'
          }`}
        />
        <h2 id="estado-pedido" className="sr-only">
          {t('Estado del pedido', 'Order status')}
        </h2>

        <div className="relative flex items-start gap-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={order.status}
              initial={{ opacity: 0, scale: 0.7, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.45, ease: EASE }}
              aria-hidden="true"
              className={`grid size-12 shrink-0 place-items-center rounded-2xl sm:size-14 ${badge}`}
            >
              <Icon className="size-6 sm:size-7" />
            </motion.span>
          </AnimatePresence>

          <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={order.status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <p className="font-display text-2xl leading-tight text-deep sm:text-3xl">{copy.title}</p>
                <p className="mt-1.5 text-[15px] text-deep/80">
                  {isReady && order.listoEn ? (
                    <>
                      <strong className="font-semibold text-emerald-800">
                        {t(`Listo a las ${formatClock(order.listoEn)}.`, `Ready at ${clock(order.listoEn, true)}.`)}
                      </strong>{' '}
                    </>
                  ) : null}
                  {copy.detail}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="relative mt-7">
          <OrderProgress status={order.status} size="md" />
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-deep/10 pt-4 text-sm text-deep/80">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-4" />
            {t('Pedido a las', 'Ordered at')}{' '}
            <time dateTime={new Date(order.creadoEn).toISOString()} className="font-semibold text-deep">
              {clock(order.creadoEn, en)}
            </time>
            {!isReady ? (
              <span>
                {t(`· hace ${formatElapsed(order.creadoEn, now)}`, `· ${formatElapsed(order.creadoEn, now)} ago`)}
              </span>
            ) : null}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative size-2 rounded-full bg-emerald-600" />
            </span>
            {t('Se actualiza solo', 'Updates automatically')}
          </span>
        </div>
      </motion.section>

      <motion.section variants={fadeUp} aria-labelledby="detalle-pedido" className={`${CARD} p-6 sm:p-8`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="detalle-pedido" className="font-display text-2xl text-deep">
            {t('Lo que', 'What you')} <em className="italic">{t('pediste', 'ordered')}</em>
          </h2>
          <span className="text-sm text-deep/75">
            {totalItems} {totalItems === 1 ? t('platillo', 'dish') : t('platillos', 'dishes')}
          </span>
        </div>

        <motion.ul variants={staggerContainer(0.05, 0.1)} className="mt-4 divide-y divide-deep/10">
          {order.items.map((line) => {
            const subtotal = lineSubtotal(line)
            return (
              <motion.li key={line.key} variants={staggerItem} className="flex items-start gap-3 py-3">
                <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-sand px-2 text-sm font-semibold text-deep tabular-nums">
                  {line.cantidad}
                  <span className="sr-only"> ×</span>
                </span>
                <span className="min-w-0 flex-1 pt-1 text-[15px] leading-snug break-words text-ink">{lineTitle(line)}</span>
                <span className="shrink-0 pt-1 text-right text-sm text-deep">
                  <span className="font-semibold">{subtotal === null ? priceText(line) : formatMXN(subtotal)}</span>
                  {subtotal !== null && line.cantidad > 1 ? (
                    <span className="block text-xs text-deep/75">{priceText(line)}</span>
                  ) : null}
                </span>
              </motion.li>
            )
          })}
        </motion.ul>

        {order.items.length > 0 ? (
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-deep/15 pt-4">
            <span className="text-sm font-semibold text-deep">Total</span>
            <span className="text-right font-display text-2xl text-deep">{en ? totalTextEn(order.items) : totalText(order.items)}</span>
          </div>
        ) : null}

        {order.notas ? (
          <p className="mt-4 flex gap-2 rounded-2xl bg-gold/25 px-4 py-3 text-sm text-deep">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">
              <strong className="font-semibold">{t('Nota para cocina:', 'Note for the kitchen:')}</strong> {order.notas}
            </span>
          </p>
        ) : null}
      </motion.section>

      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link to={menuHref(order.mesa)} className={LINK_PRIMARY}>
          <ArrowLeftIcon className="size-5" />
          {t('Volver al menú', 'Back to menu')}
        </Link>
        <Link to={`/?mesa=${order.mesa}`} className={LINK_SECONDARY}>
          <TableIcon className="size-5" />
          {t(`Estado de la Mesa ${order.mesa}`, `Table ${order.mesa} status`)}
        </Link>
      </motion.div>

      <motion.p variants={fadeUp} className="text-sm text-deep/75">
        {t(
          'Demo: el estado cambia en vivo cuando la cocina mueve el pedido en',
          'Demo: the status updates live when the kitchen moves the order in',
        )}{' '}
        <Link to="/cocina" className="font-semibold text-ocean-deep underline underline-offset-4">
          /cocina
        </Link>
        {t('. Los pedidos sólo existen en este navegador.', '. Orders only exist in this browser.')}
      </motion.p>
    </motion.div>
  )
}

function DeliveredOrder({ order }: { order: Order }) {
  const { t } = useLang()
  return (
    <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold tracking-[0.18em] text-ocean-deep uppercase">
          {t('Pedido', 'Order')} {order.id} · {t('Mesa', 'Table')} {order.mesa}
        </p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] text-deep sm:text-5xl">
          {t('¡Buen', 'Enjoy')} <em className="text-sunset-deep italic">{t('provecho!', 'your meal!')}</em>
        </h1>
      </motion.div>
      <motion.div variants={fadeUp} className={`${CARD} p-6 sm:p-8`}>
        <p className="flex items-start gap-3 text-[15px] text-deep/80" role="status">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-700 text-white" aria-hidden="true">
            <CheckIcon className="size-5" />
          </span>
          <span className="pt-2">
            {t(
              'La cocina marcó este pedido como entregado. Si quieres algo más, puedes seguir pidiendo desde el menú.',
              'The kitchen marked this order as delivered. If you’d like anything else, you can keep ordering from the menu.',
            )}
          </span>
        </p>
      </motion.div>
      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
        <Link to={menuHref(order.mesa)} className={LINK_PRIMARY}>
          <ArrowLeftIcon className="size-5" />
          {t('Volver al menú', 'Back to menu')}
        </Link>
      </motion.div>
    </motion.div>
  )
}

function MissingOrder({ id }: { id: string }) {
  const { t } = useLang()
  return (
    <motion.div variants={staggerContainer(0.08)} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold tracking-[0.18em] text-ocean-deep uppercase">{t('Seguimiento de pedido', 'Order tracking')}</p>
        <h1 className="mt-2 font-display text-4xl leading-[1.05] break-words text-deep sm:text-5xl">
          {t('No encontramos el pedido', 'We couldn’t find order')}{' '}
          <span className="text-sunset-deep italic">{id || t('solicitado', 'requested')}</span>
        </h1>
      </motion.div>
      <motion.div variants={fadeUp} className={`${CARD} space-y-3 p-6 text-[15px] text-deep/80 sm:p-8`}>
        <p className="flex items-start gap-3">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-ocean-deep" />
          <span>
            {t(
              'En este demo, los pedidos sólo existen en el mismo navegador donde se crearon desde',
              'In this demo, orders only exist in the same browser where they were created from',
            )}{' '}
            <strong className="font-semibold text-deep">/mesero</strong>
            {t(
              '. Si abriste este enlace en otro teléfono o navegador, o si se vació el demo, el pedido no aparecerá aquí.',
              '. If you opened this link on another phone or browser, or the demo was reset, the order won’t show up here.',
            )}
          </span>
        </p>
        <p className="pl-8">
          {t(
            'Revisa que el número de pedido esté bien escrito (por ejemplo, MC-4K7Q2).',
            'Check that the order number is spelled correctly (for example, MC-4K7Q2).',
          )}
        </p>
      </motion.div>
      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
        <Link to="/" className={LINK_PRIMARY}>
          <ArrowLeftIcon className="size-5" />
          {t('Ir al inicio', 'Go to home page')}
        </Link>
        <Link to="/mesero" className={LINK_SECONDARY}>
          <TableIcon className="size-5" />
          {t('Abrir /mesero', 'Open /mesero')}
        </Link>
      </motion.div>
    </motion.div>
  )
}
