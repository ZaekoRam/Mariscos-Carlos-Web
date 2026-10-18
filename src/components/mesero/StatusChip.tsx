import { STATUS_LABEL, type OrderStatus } from '../../store/orders'

const CHIP: Record<OrderStatus, string> = {
  pendiente: 'bg-gold/35 text-deep dark:bg-gold dark:text-deep',
  preparacion: 'bg-ocean-deep/10 text-ocean-deep dark:bg-ocean-deep dark:text-white',
  listo: 'bg-emerald-700 text-white dark:bg-emerald-400 dark:text-deep',
}

const DOT: Record<OrderStatus, string> = {
  pendiente: 'bg-sunset-deep dark:bg-deep',
  preparacion: 'bg-ocean-deep dark:bg-white',
  listo: 'bg-white motion-safe:animate-pulse dark:bg-deep',
}

/** Etiqueta de estado. Con `emphasize`, "Listo" se muestra como "¡Listo para servir!". */
export default function StatusChip({
  status,
  emphasize = false,
  className = '',
}: {
  status: OrderStatus
  emphasize?: boolean
  className?: string
}) {
  const label = status === 'listo' && emphasize ? '¡Listo para servir!' : STATUS_LABEL[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${CHIP[status]} ${className}`}
    >
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${DOT[status]}`} />
      {label}
    </span>
  )
}
