import { motion } from 'motion/react'
import { SITE } from '../../config/site'
import { EASE } from '../../lib/motion'
import type { Order } from '../../store/orders'
import StatusChip from './StatusChip'
import { pedidosText, platillosText, summarizeTable } from './styles'

const MESAS = Array.from({ length: SITE.totalMesas }, (_, i) => i + 1)

/**
 * Cuadrícula de mesas: botones grandes con el estado en vivo de cada mesa.
 * `compact` = hay una mesa abierta en el panel lateral (menos columnas en escritorio).
 */
export default function TableGrid({
  orders,
  draftCounts,
  selected,
  compact,
  onSelect,
  registerTile,
}: {
  orders: Order[]
  draftCounts: Map<number, number>
  selected: number | null
  compact: boolean
  onSelect: (mesa: number) => void
  registerTile: (mesa: number, el: HTMLButtonElement | null) => void
}) {
  const columns = compact ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'

  return (
    <ul className={`grid gap-3 sm:gap-4 ${columns}`}>
      {MESAS.map((mesa) => {
        const tableOrders = orders.filter((o) => o.mesa === mesa)
        const { count, status } = summarizeTable(tableOrders)
        const draftCount = draftCounts.get(mesa) ?? 0
        const isSelected = selected === mesa
        const ready = status === 'listo'

        const tone = isSelected
          ? 'border-deep bg-white ring-2 ring-deep shadow-lg dark:border-gold dark:bg-white/10 dark:ring-gold'
          : ready
            ? 'border-emerald-600/60 bg-emerald-50 ring-1 ring-emerald-600/40 dark:border-emerald-400/60 dark:bg-emerald-400/10 dark:ring-emerald-400/40'
            : 'border-deep/10 bg-white/70 hover:shadow-lg dark:border-white/10 dark:bg-white/5'

        return (
          <motion.li key={mesa} layout="position" transition={{ duration: 0.45, ease: EASE }}>
            <motion.button
              ref={(el) => registerTile(mesa, el)}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(mesa)}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`relative flex min-h-32 w-full flex-col items-start justify-between gap-3 rounded-3xl border p-4 text-left shadow-[0_18px_40px_-24px_rgb(19_50_74/0.45)] transition-[box-shadow,border-color,background-color] duration-300 dark:shadow-none ${tone}`}
            >
              <span className="flex w-full items-start justify-between gap-2">
                <span className="flex flex-col">
                  <span className="text-[11px] font-semibold tracking-[0.16em] text-deep/70 uppercase dark:text-foam/75">
                    Mesa
                  </span>{' '}
                  <span className="font-display text-4xl leading-none text-deep tabular-nums dark:text-foam">{mesa}</span>
                </span>
                {draftCount > 0 ? (
                  <>
                    <span
                      aria-hidden="true"
                      title="Comanda sin enviar"
                      className="mt-1 size-3 shrink-0 rounded-full bg-sunset ring-4 ring-sunset/20 dark:bg-gold dark:ring-gold/25"
                    />
                    <span className="sr-only">
                      {' '}
                      — comanda sin enviar ({platillosText(draftCount)})
                    </span>
                  </>
                ) : null}
              </span>
              <span className="flex flex-col items-start gap-1.5">
                {status ? (
                  <>
                    {' '}
                    <StatusChip status={status} emphasize />
                  </>
                ) : null}{' '}
                <span className="text-xs font-medium text-deep/70 dark:text-foam/75">
                  {count === 0 ? 'Sin pedidos' : pedidosText(count)}
                </span>
              </span>
            </motion.button>
          </motion.li>
        )
      })}
    </ul>
  )
}
