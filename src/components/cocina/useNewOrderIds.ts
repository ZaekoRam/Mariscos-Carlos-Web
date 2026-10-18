import { useCallback, useEffect, useRef, useState } from 'react'
import type { Order } from '../../store/orders'

/**
 * Detecta pedidos que llegan desde otra pestaña (por ejemplo, /mesero) para
 * resaltarlos un momento con la etiqueta "Nuevo".
 *
 * - Los pedidos presentes al abrir el tablero no se marcan.
 * - Los pedidos de ejemplo (`ejemplo: true`) nunca se marcan, vengan de esta
 *   pestaña o de otra; sólo se resaltan los pedidos reales.
 * - `markKnown` permite registrar ids a mano para que no se resalten.
 */
export function useNewOrderIds(
  orders: Order[],
  onArrive?: (arrivals: Order[]) => void,
  durationMs = 8000,
) {
  const known = useRef<Set<string> | null>(null)
  const timers = useRef<number[]>([])
  const onArriveRef = useRef(onArrive)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    onArriveRef.current = onArrive
  }, [onArrive])

  const markKnown = useCallback((ids: string[]) => {
    if (!known.current) known.current = new Set()
    for (const id of ids) known.current.add(id)
  }, [])

  useEffect(() => {
    if (known.current === null) {
      known.current = new Set(orders.map((o) => o.id))
      return
    }
    const seen = known.current
    const unseen = orders.filter((o) => !seen.has(o.id))
    if (unseen.length === 0) return
    for (const o of unseen) seen.add(o.id)
    const arrivals = unseen.filter((o) => !o.ejemplo)
    if (arrivals.length === 0) return
    const ids = arrivals.map((o) => o.id)
    setFresh((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
    onArriveRef.current?.(arrivals)
    const timer = window.setTimeout(() => {
      setFresh((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
    }, durationMs)
    timers.current.push(timer)
  }, [orders, durationMs])

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
    }
  }, [])

  return { fresh, markKnown }
}
