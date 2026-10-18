import { useCallback, useEffect, useMemo, useState } from 'react'
import { addLine, setLineQuantity, type OrderLine } from '../../lib/lines'
import { readJSON, STORAGE_KEYS, writeJSON } from '../../lib/storage'

/** Comanda en borrador de una mesa (aún no enviada a cocina). */
export interface TableDraft {
  lines: OrderLine[]
  notas: string
}

type Drafts = Record<string, TableDraft>

const EMPTY_DRAFT: TableDraft = { lines: [], notas: '' }

function isLine(value: unknown): value is OrderLine {
  if (typeof value !== 'object' || value === null) return false
  const l = value as OrderLine
  return (
    typeof l.key === 'string' &&
    typeof l.itemId === 'string' &&
    typeof l.nombre === 'string' &&
    typeof l.opcionesTexto === 'string' &&
    typeof l.cantidad === 'number' &&
    l.cantidad > 0 &&
    (l.precioUnitario === null || typeof l.precioUnitario === 'number') &&
    typeof l.seleccion === 'object' &&
    l.seleccion !== null
  )
}

function sanitize(value: unknown): Drafts {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const result: Drafts = {}
  for (const [mesa, draft] of Object.entries(value as Record<string, unknown>)) {
    if (typeof draft !== 'object' || draft === null) continue
    const d = draft as Partial<TableDraft>
    const lines = Array.isArray(d.lines) ? d.lines.filter(isLine) : []
    const notas = typeof d.notas === 'string' ? d.notas : ''
    if (lines.length > 0 || notas.trim()) result[mesa] = { lines, notas }
  }
  return result
}

/**
 * Borradores de comanda por mesa. Se guardan en localStorage (con try/catch dentro de
 * los helpers) para que recargar la página no los pierda.
 */
export function useDrafts() {
  const [drafts, setDrafts] = useState<Drafts>(() => sanitize(readJSON<unknown>(STORAGE_KEYS.meseroDrafts, {})))

  useEffect(() => {
    writeJSON(STORAGE_KEYS.meseroDrafts, drafts)
  }, [drafts])

  const update = useCallback((mesa: number, change: (draft: TableDraft) => TableDraft) => {
    setDrafts((prev) => {
      const current = prev[mesa] ?? EMPTY_DRAFT
      const next = change(current)
      const copy = { ...prev }
      if (next.lines.length === 0 && !next.notas.trim()) delete copy[mesa]
      else copy[mesa] = next
      return copy
    })
  }, [])

  const getDraft = useCallback((mesa: number): TableDraft => drafts[mesa] ?? EMPTY_DRAFT, [drafts])

  const add = useCallback(
    (mesa: number, line: OrderLine) => update(mesa, (d) => ({ ...d, lines: addLine(d.lines, line) })),
    [update],
  )

  const setQuantity = useCallback(
    (mesa: number, key: string, cantidad: number) =>
      update(mesa, (d) => ({ ...d, lines: setLineQuantity(d.lines, key, cantidad) })),
    [update],
  )

  const setNotas = useCallback((mesa: number, notas: string) => update(mesa, (d) => ({ ...d, notas })), [update])

  const clear = useCallback((mesa: number) => update(mesa, () => EMPTY_DRAFT), [update])

  const clearAll = useCallback(() => setDrafts({}), [])

  /** Platillos en borrador por mesa (para el punto de "comanda sin enviar"). */
  const counts = useMemo(() => {
    const map = new Map<number, number>()
    for (const [mesa, draft] of Object.entries(drafts)) {
      const count = draft.lines.reduce((sum, l) => sum + l.cantidad, 0)
      if (count > 0) map.set(Number(mesa), count)
    }
    return map
  }, [drafts])

  return { getDraft, add, setQuantity, setNotas, clear, clearAll, counts }
}
