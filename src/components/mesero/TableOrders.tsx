import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router'
import { formatClock, formatElapsed, useNow } from '../../lib/hooks'
import { lineTitle, linesCount } from '../../lib/lines'
import { EASE } from '../../lib/motion'
import { useOrdersByMesa } from '../../store/orders'
import { ArrowRightIcon } from '../icons'
import { OrderProgress } from '../orders/OrderProgress'
import StatusChip from './StatusChip'
import { EYEBROW, TEXT_MUTED, TEXT_STRONG, platillosText } from './styles'

/** Pedidos ya enviados de una mesa, con progreso y tiempo transcurrido en vivo. */
export default function TableOrders({ mesa, dark }: { mesa: number; dark: boolean }) {
  const orders = useOrdersByMesa(mesa)
  const now = useNow(1000)

  return (
    <div className="px-4 pt-2 pb-6 sm:px-5">
      <div className="flex items-baseline justify-between gap-3 border-t border-deep/10 pt-5 dark:border-white/10">
        <h3 className={`font-display text-xl ${TEXT_STRONG}`}>Pedidos de la mesa</h3>
        <span className={`text-xs font-semibold ${TEXT_MUTED}`}>
          {orders.length === 0 ? 'Ninguno' : orders.length === 1 ? '1 enviado' : `${orders.length} enviados`}
        </span>
      </div>

      {orders.length === 0 ? (
        <p className={`mt-3 text-sm ${TEXT_MUTED}`}>Aún no hay pedidos enviados para la Mesa {mesa}.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {orders.map((order) => {
              const ready = order.status === 'listo'
              const since = ready && order.listoEn ? order.listoEn : order.creadoEn
              const preview = order.items.slice(0, 3)
              const rest = order.items.length - preview.length
              return (
                <motion.li
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className={`rounded-2xl border p-4 ${
                    ready
                      ? 'border-emerald-600/50 bg-emerald-50 dark:border-emerald-400/50 dark:bg-emerald-400/10'
                      : 'border-deep/10 bg-white dark:border-white/10 dark:bg-white/5'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className={EYEBROW}>
                        {order.id}
                        {order.ejemplo ? <span className="ml-1.5 normal-case tracking-normal">(ejemplo)</span> : null}
                      </p>
                      <p className={`mt-1 text-xs ${TEXT_MUTED}`}>
                        Enviado a las {formatClock(order.creadoEn)} · {ready ? 'listo hace ' : 'hace '}
                        {formatElapsed(since, now)}
                      </p>
                    </div>
                    <StatusChip status={order.status} emphasize />
                  </div>

                  <ul className={`mt-3 space-y-0.5 text-sm ${TEXT_STRONG}`}>
                    {preview.map((line) => (
                      <li key={line.key} className="flex gap-2">
                        <span className="shrink-0 font-semibold tabular-nums">{line.cantidad}×</span>
                        <span className="min-w-0">{lineTitle(line)}</span>
                      </li>
                    ))}
                    {rest > 0 ? (
                      <li className={`text-xs ${TEXT_MUTED}`}>
                        y {rest === 1 ? '1 línea más' : `${rest} líneas más`} ({platillosText(linesCount(order.items))} en total)
                      </li>
                    ) : null}
                  </ul>
                  {order.notas ? (
                    <p className={`mt-2 text-xs italic ${TEXT_MUTED}`}>Nota: {order.notas}</p>
                  ) : null}

                  <div className="mt-4">
                    <OrderProgress status={order.status} size="sm" tone={dark ? 'dark' : 'light'} />
                  </div>

                  <Link
                    to={'/pedido/' + order.id}
                    className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-full text-sm font-semibold text-ocean-deep underline-offset-4 hover:underline dark:text-gold"
                  >
                    Ver estado del pedido
                    <ArrowRightIcon className="size-4" />
                    <span className="sr-only"> {order.id}</span>
                  </Link>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}
