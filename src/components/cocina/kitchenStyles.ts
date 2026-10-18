import type { Order, OrderStatus } from '../../store/orders'

/** Minutos a partir de los cuales un pedido se marca en ámbar y en rojo. */
export const WARN_AFTER_MS = 15 * 60_000
export const LATE_AFTER_MS = 25 * 60_000

export type Urgency = 'ok' | 'warn' | 'late'

/** Urgencia según el tiempo desde que se creó (sólo en pendiente / en preparación). */
export function orderUrgency(order: Order, now: number): Urgency {
  if (order.status === 'listo') return 'ok'
  const elapsed = now - order.creadoEn
  if (elapsed >= LATE_AFTER_MS) return 'late'
  if (elapsed >= WARN_AFTER_MS) return 'warn'
  return 'ok'
}

export const URGENCY_CHIP: Record<Urgency, string> = {
  ok: 'bg-deep/[0.06] text-deep dark:bg-white/10 dark:text-foam',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
  late: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200',
}

export const URGENCY_SR: Record<Urgency, string> = {
  ok: '',
  warn: ' (más de 15 minutos)',
  late: ' (más de 25 minutos, urgente)',
}

/** Acentos de cada columna del tablero. */
export const COLUMN_STYLE: Record<OrderStatus, { dot: string; tint: string; empty: string }> = {
  pendiente: {
    dot: 'bg-gold',
    tint: 'border-gold/40 bg-gold/[0.10] dark:border-gold/25 dark:bg-gold/[0.05]',
    empty: 'Sin pedidos pendientes. Los nuevos llegan aquí.',
  },
  preparacion: {
    dot: 'bg-ocean',
    tint: 'border-ocean/30 bg-ocean/[0.07] dark:border-ocean/40 dark:bg-ocean/[0.10]',
    empty: 'Nada en preparación por ahora.',
  },
  listo: {
    dot: 'bg-emerald-600',
    tint: 'border-emerald-600/30 bg-emerald-600/[0.07] dark:border-emerald-500/30 dark:bg-emerald-500/[0.08]',
    empty: 'No hay pedidos esperando entrega.',
  },
}

export const BTN_BASE =
  'inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold whitespace-nowrap transition-colors duration-200 select-none disabled:cursor-not-allowed disabled:opacity-50'

export const BTN_VARIANT = {
  start: 'bg-ocean-deep text-white hover:bg-deep dark:bg-ocean dark:hover:bg-ocean-deep',
  ready: 'bg-emerald-700 text-white hover:bg-emerald-800',
  deliver: 'bg-deep text-white hover:bg-deep/90 dark:bg-gold dark:text-deep dark:hover:bg-gold/90',
  secondary:
    'border border-deep/20 bg-white/60 text-deep hover:bg-deep/5 dark:border-white/20 dark:bg-transparent dark:text-foam dark:hover:bg-white/10',
  danger:
    'border border-red-700/30 bg-white/60 text-red-800 hover:bg-red-50 dark:border-red-400/40 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/10',
} as const
