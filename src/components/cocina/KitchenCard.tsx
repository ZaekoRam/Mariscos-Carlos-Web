import { AnimatePresence, motion, useIsPresent } from 'motion/react'
import { useEffect, useRef } from 'react'
import { formatClock, formatElapsed } from '../../lib/hooks'
import { lineTitle } from '../../lib/lines'
import { buttonTap, EASE } from '../../lib/motion'
import type { Order } from '../../store/orders'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClockIcon, FlameIcon, InfoIcon } from '../icons'
import { BTN_BASE, BTN_VARIANT, orderUrgency, URGENCY_CHIP, URGENCY_SR } from './kitchenStyles'

export type KitchenAction = 'start' | 'ready' | 'deliver' | 'back'

interface KitchenCardProps {
  order: Order
  now: number
  isNew: boolean
  /** Enfocar la tarjeta al montarse (después de moverla de columna con el teclado o el mouse). */
  focusOnMount: boolean
  onFocused: () => void
  onAction: (order: Order, action: KitchenAction) => void
}

/** Comanda en el tablero de cocina. */
export default function KitchenCard({ order, now, isNew, focusOnMount, onFocused, onAction }: KitchenCardProps) {
  const ref = useRef<HTMLElement>(null)
  // Mientras la tarjeta sale (ya cambió de columna), no acepta toques ni clics.
  const isPresent = useIsPresent()
  const act = (action: KitchenAction) => {
    if (isPresent) onAction(order, action)
  }
  const urgency = orderUrgency(order, now)
  const titleId = `comanda-${order.id}`
  const elapsed = formatElapsed(order.creadoEn, now)
  const totalItems = order.items.reduce((sum, l) => sum + l.cantidad, 0)

  useEffect(() => {
    if (!focusOnMount) return
    ref.current?.focus({ preventScroll: false })
    onFocused()
  }, [focusOnMount, onFocused])

  return (
    <motion.li
      layout
      layoutId={order.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2, ease: EASE } }}
      transition={{ duration: 0.5, ease: EASE }}
      inert={!isPresent}
      className={`list-none ${isPresent ? '' : 'pointer-events-none'}`}
    >
      <article
        ref={ref}
        tabIndex={-1}
        aria-labelledby={titleId}
        className={`relative rounded-3xl border bg-white/90 p-4 shadow-[0_18px_40px_-24px_rgb(19_50_74/0.45)] transition-[box-shadow,border-color] duration-500 sm:p-5 dark:bg-[#132A3D] dark:shadow-none ${
          isNew
            ? 'border-gold ring-4 ring-gold/40 dark:ring-gold/30'
            : 'border-deep/10 dark:border-white/10'
        }`}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 id={titleId} className="font-display text-3xl leading-none text-deep dark:text-foam">
                Mesa {order.mesa}
              </h4>
              <AnimatePresence>
                {isNew ? (
                  <motion.span
                    key="nuevo"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold tracking-wide text-deep uppercase"
                  >
                    Nuevo
                  </motion.span>
                ) : null}
              </AnimatePresence>
              {order.ejemplo ? (
                <span className="rounded-full border border-deep/15 px-2 py-0.5 text-[11px] font-medium text-deep/75 dark:border-white/15 dark:text-foam/75">
                  Ejemplo
                </span>
              ) : null}
            </div>
            <p className="mt-2 font-mono text-xs tracking-wide text-deep/75 dark:text-foam/75">
              {order.id} · {totalItems} {totalItems === 1 ? 'platillo' : 'platillos'}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${URGENCY_CHIP[urgency]}`}
            >
              {urgency === 'late' ? <FlameIcon className="size-4" /> : <ClockIcon className="size-4" />}
              <span className="sr-only">Tiempo desde que se pidió: </span>
              {elapsed}
              <span className="sr-only">{URGENCY_SR[urgency]}</span>
            </span>
            <span className="text-xs text-deep/75 dark:text-foam/75">
              Pedido a las <time dateTime={new Date(order.creadoEn).toISOString()}>{formatClock(order.creadoEn)}</time>
            </span>
          </div>
        </header>

        <ul className="mt-4 space-y-1.5 border-t border-deep/10 pt-3 text-[15px] leading-snug text-ink dark:border-white/10 dark:text-foam">
          {order.items.map((line) => (
            <li key={line.key} className="flex gap-2">
              <span className="w-9 shrink-0 font-semibold text-deep tabular-nums dark:text-gold">{line.cantidad} ×</span>
              <span className="min-w-0 break-words">{lineTitle(line)}</span>
            </li>
          ))}
          {order.items.length === 0 ? (
            <li className="text-deep/75 dark:text-foam/75">Sin platillos registrados.</li>
          ) : null}
        </ul>

        {order.notas ? (
          <p className="mt-3 flex gap-2 rounded-2xl bg-gold/25 px-3 py-2 text-sm text-deep dark:bg-gold/15 dark:text-gold">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 break-words">
              <strong className="font-semibold">Nota:</strong> {order.notas}
            </span>
          </p>
        ) : null}

        {order.status === 'listo' && order.listoEn ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckIcon className="size-4" />
            Listo a las {formatClock(order.listoEn)}
            <span className="font-normal text-deep/75 dark:text-foam/75">
              · tardó {formatElapsed(order.creadoEn, order.listoEn)}
            </span>
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === 'pendiente' ? (
            <motion.button
              type="button"
              whileTap={buttonTap}
              onClick={() => act('start')}
              aria-label={`Empezar — Mesa ${order.mesa}, pedido ${order.id}`}
              className={`${BTN_BASE} ${BTN_VARIANT.start} flex-1`}
            >
              Empezar
              <ArrowRightIcon className="size-5" />
            </motion.button>
          ) : null}

          {order.status === 'preparacion' ? (
            <>
              <motion.button
                type="button"
                whileTap={buttonTap}
                onClick={() => act('ready')}
                aria-label={`Marcar listo — Mesa ${order.mesa}, pedido ${order.id}`}
                className={`${BTN_BASE} ${BTN_VARIANT.ready} flex-1`}
              >
                <CheckIcon className="size-5" />
                Marcar listo
              </motion.button>
              <motion.button
                type="button"
                whileTap={buttonTap}
                onClick={() => act('back')}
                aria-label={`Regresar a pendiente — Mesa ${order.mesa}, pedido ${order.id}`}
                className={`${BTN_BASE} ${BTN_VARIANT.secondary}`}
              >
                <ArrowLeftIcon className="size-4" />
                Regresar
              </motion.button>
            </>
          ) : null}

          {order.status === 'listo' ? (
            <>
              <motion.button
                type="button"
                whileTap={buttonTap}
                onClick={() => act('deliver')}
                aria-label={`Entregado — quitar pedido ${order.id} de la Mesa ${order.mesa}`}
                className={`${BTN_BASE} ${BTN_VARIANT.deliver} flex-1`}
              >
                <CheckIcon className="size-5" />
                Entregado
              </motion.button>
              <motion.button
                type="button"
                whileTap={buttonTap}
                onClick={() => act('back')}
                aria-label={`Regresar a en preparación — Mesa ${order.mesa}, pedido ${order.id}`}
                className={`${BTN_BASE} ${BTN_VARIANT.secondary}`}
              >
                <ArrowLeftIcon className="size-4" />
                Regresar
              </motion.button>
            </>
          ) : null}
        </div>
      </article>
    </motion.li>
  )
}
