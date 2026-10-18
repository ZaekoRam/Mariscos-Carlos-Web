import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  addLine,
  createLine,
  hasPerKiloLines,
  linesCount,
  linesTotal,
  setLineQuantity,
  type OrderLine,
} from '../lib/lines'
import type { MenuItem, Selection } from '../lib/menu'
import { readJSON, STORAGE_KEYS, writeJSON } from '../lib/storage'

/** Carrito del cliente (pedido por WhatsApp). Se guarda en localStorage si está disponible. */
export interface CartContextValue {
  lines: OrderLine[]
  /** Número de platillos (suma de cantidades). */
  count: number
  /** Total estimado de productos con precio fijo, en MXN. */
  total: number
  /** true si hay productos por kilo (no suman al total). */
  hasPerKilo: boolean
  addItem: (item: MenuItem, selection: Selection, cantidad?: number) => void
  increment: (key: string) => void
  decrement: (key: string) => void
  remove: (key: string) => void
  clear: () => void
  /** Estado del panel lateral del carrito. */
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  /** Último platillo agregado (para animar el botón flotante). Cambia en cada "Agregar". */
  lastAdded: { key: string; at: number } | null
}

const CartContext = createContext<CartContextValue | null>(null)

function loadCart(): OrderLine[] {
  const stored = readJSON<unknown>(STORAGE_KEYS.cart, [])
  if (!Array.isArray(stored)) return []
  return stored.filter(
    (l): l is OrderLine =>
      typeof l === 'object' && l !== null && typeof (l as OrderLine).key === 'string' && typeof (l as OrderLine).cantidad === 'number',
  )
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<OrderLine[]>(loadCart)
  const [isOpen, setIsOpen] = useState(false)
  const [lastAdded, setLastAdded] = useState<{ key: string; at: number } | null>(null)

  useEffect(() => {
    writeJSON(STORAGE_KEYS.cart, lines)
  }, [lines])

  const addItem = useCallback((item: MenuItem, selection: Selection, cantidad = 1) => {
    const line = createLine(item, selection, cantidad)
    setLines((prev) => addLine(prev, line))
    setLastAdded({ key: line.key, at: Date.now() })
  }, [])

  const increment = useCallback((key: string) => {
    setLines((prev) => {
      const line = prev.find((l) => l.key === key)
      return line ? setLineQuantity(prev, key, line.cantidad + 1) : prev
    })
  }, [])

  const decrement = useCallback((key: string) => {
    setLines((prev) => {
      const line = prev.find((l) => l.key === key)
      return line ? setLineQuantity(prev, key, line.cantidad - 1) : prev
    })
  }, [])

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => l.key !== key)), [])
  const clear = useCallback(() => setLines([]), [])
  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: linesCount(lines),
      total: linesTotal(lines),
      hasPerKilo: hasPerKiloLines(lines),
      addItem,
      increment,
      decrement,
      remove,
      clear,
      isOpen,
      openCart,
      closeCart,
      lastAdded,
    }),
    [lines, addItem, increment, decrement, remove, clear, isOpen, openCart, closeCart, lastAdded],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
