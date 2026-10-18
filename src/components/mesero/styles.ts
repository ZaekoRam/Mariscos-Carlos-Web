import type { Order, OrderStatus } from '../../store/orders'

/** Clases compartidas del demo de mesero (claro / oscuro, contraste AA en ambos). */
export const TEXT_STRONG = 'text-deep dark:text-foam'
export const TEXT_MUTED = 'text-deep/70 dark:text-foam/75'
export const EYEBROW = 'text-[11px] font-semibold tracking-[0.16em] uppercase text-ocean-deep dark:text-gold'
/** Superficie opaca del panel (los encabezados fijos necesitan fondo sólido). */
export const SURFACE = 'bg-white dark:bg-[#10273A]'
export const CARD =
  'rounded-3xl border border-deep/10 bg-white/70 shadow-[0_18px_40px_-24px_rgb(19_50_74/0.45)] dark:border-white/10 dark:bg-white/5 dark:shadow-none'
export const ICON_BUTTON =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-deep/15 text-deep transition-colors hover:bg-deep/5 dark:border-white/20 dark:text-foam dark:hover:bg-white/10'
export const PRIMARY_SMALL =
  'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-deep px-4 text-sm font-semibold text-white transition-colors hover:bg-deep/90 dark:bg-gold dark:text-deep dark:hover:bg-gold/90'

const PRIORITY: Record<OrderStatus, number> = { pendiente: 1, preparacion: 2, listo: 3 }

/** Resumen de una mesa: pedidos activos y el estado más avanzado. */
export function summarizeTable(orders: Order[]): { count: number; status: OrderStatus | null } {
  let status: OrderStatus | null = null
  for (const order of orders) {
    if (!status || PRIORITY[order.status] > PRIORITY[status]) status = order.status
  }
  return { count: orders.length, status }
}

export function pedidosText(count: number): string {
  return count === 1 ? '1 pedido' : `${count} pedidos`
}

export function platillosText(count: number): string {
  return count === 1 ? '1 platillo' : `${count} platillos`
}
