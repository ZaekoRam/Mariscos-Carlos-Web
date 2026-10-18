import { useSyncExternalStore } from 'react'
import { createLine, type OrderLine } from '../lib/lines'
import { defaultSelection, findItem } from '../lib/menu'
import { readJSON, STORAGE_KEYS, writeJSON } from '../lib/storage'

/**
 * Pedidos del demo mesero → cocina → cliente.
 *
 * - Viven en memoria y se guardan en localStorage (si está disponible).
 * - Se sincronizan entre pestañas del mismo navegador con BroadcastChannel("mariscos-carlos")
 *   y, como respaldo, con el evento "storage".
 * - Si el almacenamiento está bloqueado, el demo sigue funcionando en memoria
 *   (y BroadcastChannel sigue sincronizando pestañas abiertas).
 */

export type OrderStatus = 'pendiente' | 'preparacion' | 'listo'

export const ORDER_STATUSES: OrderStatus[] = ['pendiente', 'preparacion', 'listo']

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  preparacion: 'En preparación',
  listo: 'Listo',
}

export interface Order {
  id: string
  mesa: number
  items: OrderLine[]
  status: OrderStatus
  notas?: string
  /** Marcas de tiempo en milisegundos (Date.now()). */
  creadoEn: number
  actualizadoEn: number
  preparacionEn?: number
  listoEn?: number
  /** Datos de ejemplo cargados con "Cargar pedidos de ejemplo". */
  ejemplo?: boolean
}

export const CHANNEL_NAME = 'mariscos-carlos'

type ChannelMessage = { type: 'orders:update'; orders: Order[]; source: string }

const TAB_ID = Math.random().toString(36).slice(2)

let orders: Order[] = sanitize(readJSON<unknown>(STORAGE_KEYS.orders, []))
const listeners = new Set<() => void>()

let channel: BroadcastChannel | null = null
try {
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
      const data = event.data
      if (data?.type === 'orders:update' && data.source !== TAB_ID) {
        orders = sanitize(data.orders)
        emit()
      }
    }
  }
} catch {
  channel = null
}

if (typeof window !== 'undefined') {
  // Respaldo para navegadores sin BroadcastChannel: el evento storage llega a las otras pestañas.
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEYS.orders) return
    try {
      orders = sanitize(event.newValue ? JSON.parse(event.newValue) : [])
      emit()
    } catch {
      // Valor corrupto: se ignora.
    }
  })
}

function sanitize(value: unknown): Order[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (o): o is Order =>
      typeof o === 'object' &&
      o !== null &&
      typeof (o as Order).id === 'string' &&
      typeof (o as Order).mesa === 'number' &&
      Array.isArray((o as Order).items) &&
      ORDER_STATUSES.includes((o as Order).status),
  )
}

function emit() {
  for (const listener of listeners) listener()
}

function commit(next: Order[]) {
  orders = next
  writeJSON(STORAGE_KEYS.orders, orders)
  try {
    channel?.postMessage({ type: 'orders:update', orders, source: TAB_ID } satisfies ChannelMessage)
  } catch {
    // Sin canal: las otras pestañas se enteran por el evento storage (si hay almacenamiento).
  }
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return orders
}

/** Id corto y legible, por ejemplo "MC-4K7Q2". */
function createOrderId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let id = ''
  for (let i = 0; i < 5; i++) id += alphabet[Math.floor(Math.random() * alphabet.length)]
  return orders.some((o) => o.id === `MC-${id}`) ? createOrderId() : `MC-${id}`
}

export function getOrders(): Order[] {
  return orders
}

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id.toUpperCase() === id.toUpperCase())
}

export interface CreateOrderInput {
  mesa: number
  items: OrderLine[]
  notas?: string
}

/** Crea un pedido con estado "pendiente" y lo envía a cocina. */
export function createOrder({ mesa, items, notas }: CreateOrderInput): Order {
  const now = Date.now()
  const order: Order = {
    id: createOrderId(),
    mesa,
    items: items.map((l) => ({ ...l })),
    status: 'pendiente',
    notas: notas?.trim() || undefined,
    creadoEn: now,
    actualizadoEn: now,
  }
  commit([...orders, order])
  return order
}

/** Cambia el estado. Al pasar a "listo" guarda la hora (listoEn). */
export function setOrderStatus(id: string, status: OrderStatus): void {
  const now = Date.now()
  commit(
    orders.map((o) => {
      if (o.id !== id || o.status === status) return o
      return {
        ...o,
        status,
        actualizadoEn: now,
        preparacionEn: status === 'preparacion' ? now : status === 'pendiente' ? undefined : o.preparacionEn,
        listoEn: status === 'listo' ? now : undefined,
      }
    }),
  )
}

/** Avanza al siguiente estado (pendiente → en preparación → listo). */
export function advanceOrder(id: string): void {
  const order = orders.find((o) => o.id === id)
  if (!order) return
  const index = ORDER_STATUSES.indexOf(order.status)
  if (index < ORDER_STATUSES.length - 1) setOrderStatus(id, ORDER_STATUSES[index + 1])
}

/** Regresa al estado anterior. */
export function revertOrder(id: string): void {
  const order = orders.find((o) => o.id === id)
  if (!order) return
  const index = ORDER_STATUSES.indexOf(order.status)
  if (index > 0) setOrderStatus(id, ORDER_STATUSES[index - 1])
}

/** Quita un pedido (por ejemplo, cuando ya se entregó). */
export function removeOrder(id: string): void {
  commit(orders.filter((o) => o.id !== id))
}

/** Borra todos los pedidos del demo. */
export function clearOrders(): void {
  commit([])
}

/** Carga pedidos de ejemplo usando platillos reales de menu.json. */
export function seedDemoOrders(): void {
  const now = Date.now()
  const pick = (itemId: string, cantidad: number): OrderLine | null => {
    const item = findItem(itemId)
    return item ? createLine(item, defaultSelection(item), cantidad) : null
  }
  const make = (
    mesa: number,
    status: OrderStatus,
    minutesAgo: number,
    lines: (OrderLine | null)[],
    notas?: string,
  ): Order => {
    const creadoEn = now - minutesAgo * 60_000
    return {
      id: createOrderId(),
      mesa,
      items: lines.filter((l): l is OrderLine => l !== null),
      status,
      notas,
      creadoEn,
      actualizadoEn: creadoEn,
      preparacionEn: status !== 'pendiente' ? creadoEn + 2 * 60_000 : undefined,
      listoEn: status === 'listo' ? now - 60_000 : undefined,
      ejemplo: true,
    }
  }
  const examples = [
    make(2, 'pendiente', 1, [pick('en-aguachile-camaron-220', 2), pick('be-cerveza', 2)], 'Sin cebolla'),
    make(5, 'preparacion', 9, [pick('cz-pulpo-zarandeado', 1), pick('tg-tacos-dorados-camaron-4', 1), pick('be-jarra-agua', 1)]),
    make(8, 'listo', 18, [pick('co-coctel-campechano-grande', 1), pick('en-tostada-ceviche-camaron', 3)]),
  ]
  commit([...orders, ...examples])
}

/** Todos los pedidos, ordenados por hora de creación. Se actualiza en vivo entre pestañas. */
export function useOrders(): Order[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Un pedido por id (sin distinguir mayúsculas), o undefined si no existe. */
export function useOrder(id: string | undefined): Order | undefined {
  const all = useOrders()
  if (!id) return undefined
  return all.find((o) => o.id.toUpperCase() === id.toUpperCase())
}

/** Pedidos de una mesa, del más reciente al más antiguo. */
export function useOrdersByMesa(mesa: number | null): Order[] {
  const all = useOrders()
  if (mesa === null) return []
  return all.filter((o) => o.mesa === mesa).sort((a, b) => b.creadoEn - a.creadoEn)
}
