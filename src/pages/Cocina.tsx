import { LayoutGroup, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import KitchenColumn, { columnHeadingId } from '../components/cocina/KitchenColumn'
import type { KitchenAction } from '../components/cocina/KitchenCard'
import { BTN_BASE, BTN_VARIANT } from '../components/cocina/kitchenStyles'
import { useNewOrderIds } from '../components/cocina/useNewOrderIds'
import { ExternalIcon, RefreshIcon, TrashIcon } from '../components/icons'
import { StaffLayout } from '../components/orders/StaffLayout'
import { SITE } from '../config/site'
import { useNow } from '../lib/hooks'
import { buttonTap, EASE } from '../lib/motion'
import {
  clearOrders,
  getOrder,
  getOrders,
  ORDER_STATUSES,
  removeOrder,
  seedDemoOrders,
  setOrderStatus,
  STATUS_LABEL,
  useOrders,
  type Order,
  type OrderStatus,
} from '../store/orders'

/** Orden dentro de cada columna: lo más antiguo primero (primero en llegar, primero en salir). */
function sortKey(order: Order): number {
  if (order.status === 'listo') return order.listoEn ?? order.actualizadoEn
  if (order.status === 'preparacion') return order.preparacionEn ?? order.creadoEn
  return order.creadoEn
}

/**
 * Estado destino de cada botón, según el estado con el que se dibujó la tarjeta.
 * Las transiciones son absolutas (no "un paso adelante"), así un doble toque no se salta columnas.
 */
const NEXT_STATUS: Record<KitchenAction, (s: OrderStatus) => OrderStatus | null> = {
  start: (s) => (s === 'pendiente' ? 'preparacion' : null),
  ready: (s) => (s === 'preparacion' ? 'listo' : null),
  back: (s) => (s === 'listo' ? 'preparacion' : s === 'preparacion' ? 'pendiente' : null),
  deliver: () => null,
}

/** Tiempo mínimo entre dos acciones sobre la misma comanda (evita dobles toques). */
const ACTION_COOLDOWN_MS = 400

export default function Cocina() {
  const orders = useOrders()
  const now = useNow(1000)
  const [announcement, setAnnouncement] = useState('')
  const [focusId, setFocusId] = useState<string | null>(null)
  const lastActionAt = useRef<Map<string, number>>(new Map())

  const onArrive = useCallback((arrivals: Order[]) => {
    const mesas = arrivals.map((o) => `Mesa ${o.mesa}`).join(', ')
    setAnnouncement(arrivals.length === 1 ? `Nuevo pedido: ${mesas}` : `Nuevos pedidos: ${mesas}`)
  }, [])

  const { fresh, markKnown } = useNewOrderIds(orders, onArrive)

  useEffect(() => {
    const previous = document.title
    document.title = `Cocina · ${SITE.nombre}`
    return () => {
      document.title = previous
    }
  }, [])

  const columns = useMemo(() => {
    const grouped: Record<OrderStatus, Order[]> = { pendiente: [], preparacion: [], listo: [] }
    for (const order of orders) grouped[order.status].push(order)
    for (const status of ORDER_STATUSES) grouped[status].sort((a, b) => sortKey(a) - sortKey(b))
    return grouped
  }, [orders])

  const activeCount = columns.pendiente.length + columns.preparacion.length

  const handleAction = useCallback((order: Order, action: KitchenAction) => {
    // Ignora un segundo toque sobre la misma comanda mientras se mueve de columna.
    const stamp = Date.now()
    const last = lastActionAt.current.get(order.id)
    if (last !== undefined && stamp - last < ACTION_COOLDOWN_MS) return

    // Sólo actúa si el pedido sigue en el estado con el que se dibujó el botón.
    const current = getOrder(order.id)
    if (!current || current.status !== order.status) return

    if (action === 'deliver') {
      if (current.status !== 'listo') return
      lastActionAt.current.set(order.id, stamp)
      removeOrder(order.id)
      setAnnouncement(`Pedido ${order.id} de la Mesa ${order.mesa} entregado`)
      window.requestAnimationFrame(() => document.getElementById(columnHeadingId('listo'))?.focus())
      return
    }

    const target = NEXT_STATUS[action](current.status)
    if (!target) return
    lastActionAt.current.set(order.id, stamp)
    setOrderStatus(order.id, target)
    setAnnouncement(`Mesa ${order.mesa}: ${STATUS_LABEL[target]}`)
    setFocusId(order.id)
  }, [])

  const clearFocus = useCallback(() => setFocusId(null), [])

  const handleSeed = () => {
    seedDemoOrders()
    // Los pedidos de ejemplo se crean en esta pestaña: no se resaltan como "Nuevo".
    markKnown(getOrders().map((o) => o.id))
    setAnnouncement('Se cargaron pedidos de ejemplo')
  }

  const handleClear = () => {
    if (orders.length === 0) return
    const ok = window.confirm('¿Vaciar todos los pedidos del demo? Se borran en todas las pestañas de este navegador.')
    if (!ok) return
    clearOrders()
    setAnnouncement('Se vaciaron los pedidos del demo')
  }

  return (
    <StaffLayout title="Cocina">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-ocean-deep uppercase dark:text-gold">
            <span className="relative flex size-2.5" aria-hidden="true">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative size-2.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            </span>
            Tablero de cocina · en vivo
          </p>
          <h2 className="mt-2 font-display text-3xl leading-tight text-deep sm:text-4xl dark:text-foam">
            Comandas <em className="text-sunset-deep italic dark:text-gold">del día</em>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-deep/80 sm:text-[15px] dark:text-foam/80">
            {activeCount === 0
              ? 'No hay pedidos activos.'
              : `${activeCount} ${activeCount === 1 ? 'pedido activo' : 'pedidos activos'} en cocina.`}{' '}
            Abre{' '}
            <a
              href="/mesero"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 rounded font-semibold text-ocean-deep underline decoration-ocean-deep/40 underline-offset-4 hover:decoration-ocean-deep dark:text-gold dark:decoration-gold/50"
            >
              /mesero
              <ExternalIcon className="size-3.5" />
              <span className="sr-only">(se abre en otra pestaña)</span>
            </a>{' '}
            en otra pestaña y envía un pedido: aparece aquí al instante.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Herramientas del demo">
          <motion.button
            type="button"
            whileTap={buttonTap}
            onClick={handleSeed}
            className={`${BTN_BASE} ${BTN_VARIANT.secondary} h-11`}
          >
            <RefreshIcon className="size-4" />
            Cargar pedidos de ejemplo
          </motion.button>
          <motion.button
            type="button"
            whileTap={orders.length === 0 ? undefined : buttonTap}
            onClick={handleClear}
            disabled={orders.length === 0}
            className={`${BTN_BASE} ${BTN_VARIANT.danger} h-11`}
          >
            <TrashIcon className="size-4" />
            Vaciar demo
          </motion.button>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mt-8"
      >
        <LayoutGroup id="cocina">
          <div className="grid items-start gap-4 md:grid-cols-3 lg:gap-5">
            {ORDER_STATUSES.map((status) => (
              <KitchenColumn
                key={status}
                status={status}
                orders={columns[status]}
                now={now}
                fresh={fresh}
                focusId={focusId}
                onFocused={clearFocus}
                onAction={handleAction}
              />
            ))}
          </div>
        </LayoutGroup>
      </motion.div>

      <p className="mt-8 text-center text-xs text-deep/75 dark:text-foam/75">
        Los tiempos cambian a ámbar después de 15 min y a rojo después de 25 min. Los pedidos sólo existen en este navegador.
      </p>
    </StaffLayout>
  )
}
