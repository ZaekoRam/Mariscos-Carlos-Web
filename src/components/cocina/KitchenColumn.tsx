import { AnimatePresence, motion } from 'motion/react'
import { EASE } from '../../lib/motion'
import { STATUS_LABEL, type Order, type OrderStatus } from '../../store/orders'
import { CheckIcon, ChefIcon, ClockIcon } from '../icons'
import KitchenCard, { type KitchenAction } from './KitchenCard'
import { COLUMN_STYLE } from './kitchenStyles'

interface KitchenColumnProps {
  status: OrderStatus
  orders: Order[]
  now: number
  fresh: ReadonlySet<string>
  focusId: string | null
  onFocused: () => void
  onAction: (order: Order, action: KitchenAction) => void
}

const EMPTY_ICON: Record<OrderStatus, typeof ClockIcon> = {
  pendiente: ClockIcon,
  preparacion: ChefIcon,
  listo: CheckIcon,
}

export function columnHeadingId(status: OrderStatus) {
  return `columna-${status}`
}

/** Columna del tablero (Pendiente / En preparación / Listo). */
export default function KitchenColumn({ status, orders, now, fresh, focusId, onFocused, onAction }: KitchenColumnProps) {
  const style = COLUMN_STYLE[status]
  const headingId = columnHeadingId(status)
  const EmptyIcon = EMPTY_ICON[status]

  return (
    <section aria-labelledby={headingId} className={`flex min-w-0 flex-col rounded-[2rem] border p-3 sm:p-4 ${style.tint}`}>
      <header className="flex items-center justify-between gap-3 px-1 pt-1 pb-3">
        <h3
          id={headingId}
          tabIndex={-1}
          className="flex items-center gap-2.5 rounded-lg font-display text-xl text-deep dark:text-foam"
        >
          <span aria-hidden="true" className={`size-3 rounded-full ${style.dot}`} />
          {STATUS_LABEL[status]}
          <span className="sr-only">
            : {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </h3>
        <motion.span
          key={orders.length}
          aria-hidden="true"
          initial={{ scale: 0.8, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="grid h-9 min-w-9 place-items-center rounded-full bg-white px-2.5 font-sans text-sm font-bold text-deep tabular-nums shadow-sm dark:bg-white/10 dark:text-foam"
        >
          {orders.length}
        </motion.span>
      </header>

      <ol className="flex min-h-28 flex-col gap-3 md:min-h-48">
        <AnimatePresence initial={false}>
          {orders.map((order) => (
            <KitchenCard
              key={order.id}
              order={order}
              now={now}
              isNew={fresh.has(order.id)}
              focusOnMount={focusId === order.id}
              onFocused={onFocused}
              onAction={onAction}
            />
          ))}
        </AnimatePresence>
        {orders.length === 0 ? (
          <motion.li
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex flex-1 list-none flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-deep/15 px-4 py-8 text-center text-sm text-deep/75 dark:border-white/15 dark:text-foam/75"
          >
            <EmptyIcon className="size-6 opacity-70" />
            {style.empty}
          </motion.li>
        ) : null}
      </ol>
    </section>
  )
}
