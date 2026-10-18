import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import DemoToolbar from '../components/mesero/DemoToolbar'
import MobileSheet from '../components/mesero/MobileSheet'
import OrderPanel from '../components/mesero/OrderPanel'
import StatusChip from '../components/mesero/StatusChip'
import TableGrid from '../components/mesero/TableGrid'
import { EYEBROW, TEXT_MUTED, TEXT_STRONG } from '../components/mesero/styles'
import { useDrafts } from '../components/mesero/useDrafts'
import { DARK_QUERY, DESKTOP_QUERY, useMediaQuery, WIDE_QUERY } from '../components/mesero/useMediaQuery'
import { StaffLayout } from '../components/orders/StaffLayout'
import { EASE } from '../lib/motion'
import { createOrder, ORDER_STATUSES, useOrders } from '../store/orders'

/**
 * Demo de mesero: cuadrícula de 12 mesas, comanda por mesa y "Enviar a cocina".
 * Los pedidos se sincronizan al instante con /cocina en otras pestañas.
 */
export default function Mesero() {
  const orders = useOrders()
  const drafts = useDrafts()
  const [mesa, setMesa] = useState<number | null>(null)
  const [lastSent, setLastSent] = useState<{ id: string; mesa: number } | null>(null)
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const isWide = useMediaQuery(WIDE_QUERY)
  const dark = useMediaQuery(DARK_QUERY)
  const panelHeadingId = useId()
  const mesasHeadingId = useId()
  const panelHeadingRef = useRef<HTMLHeadingElement>(null)
  const tiles = useRef(new Map<number, HTMLButtonElement>())

  const registerTile = useCallback((n: number, el: HTMLButtonElement | null) => {
    if (el) tiles.current.set(n, el)
    else tiles.current.delete(n)
  }, [])

  // Al abrir una mesa, el foco pasa al encabezado del panel ("Mesa N").
  useEffect(() => {
    if (mesa === null) return
    const id = window.requestAnimationFrame(() => panelHeadingRef.current?.focus({ preventScroll: true }))
    return () => window.cancelAnimationFrame(id)
  }, [mesa])

  const mesaRef = useRef(mesa)
  useEffect(() => {
    mesaRef.current = mesa
  }, [mesa])

  // Al cerrar, el foco regresa al botón de la mesa.
  const closePanel = useCallback(() => {
    const current = mesaRef.current
    setMesa(null)
    if (current !== null) window.requestAnimationFrame(() => tiles.current.get(current)?.focus({ preventScroll: true }))
  }, [])

  const selectTable = (n: number) => {
    if (mesa === n) closePanel()
    else setMesa(n)
  }

  const counts = ORDER_STATUSES.map((status) => ({
    status,
    total: orders.filter((o) => o.status === status).length,
  }))

  const panel =
    mesa !== null ? (
      <OrderPanel
        key={mesa}
        mesa={mesa}
        draft={drafts.getDraft(mesa)}
        dark={dark}
        split={isWide}
        variant={isDesktop ? 'side' : 'sheet'}
        headingId={panelHeadingId}
        headingRef={panelHeadingRef}
        sentOrderId={lastSent && lastSent.mesa === mesa ? lastSent.id : null}
        onClose={closePanel}
        onAdd={(line) => {
          drafts.add(mesa, line)
          if (lastSent?.mesa === mesa) setLastSent(null)
        }}
        onQuantity={(key, cantidad) => drafts.setQuantity(mesa, key, cantidad)}
        onNotas={(notas) => drafts.setNotas(mesa, notas)}
        onClear={() => drafts.clear(mesa)}
        onSend={() => {
          const draft = drafts.getDraft(mesa)
          if (draft.lines.length === 0) return null
          const order = createOrder({ mesa, items: draft.lines, notas: draft.notas })
          drafts.clear(mesa)
          setLastSent({ id: order.id, mesa })
          return order.id
        }}
        onDismissSent={() => setLastSent(null)}
      />
    ) : null

  const open = mesa !== null

  return (
    <StaffLayout title="Mesero">
      <div className="[color-scheme:light] dark:[color-scheme:dark]">
        <LayoutGroup>
          <div
            className={`grid items-start gap-6 lg:gap-8 ${
              open && isDesktop ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]' : ''
            }`}
          >
            <div className="flex min-w-0 flex-col gap-6">
              <div>
                <p className={EYEBROW}>Demo · Pantalla del mesero</p>
                <h2 className={`mt-2 font-display text-4xl leading-[1.05] text-balance sm:text-5xl ${TEXT_STRONG}`}>
                  Toma la orden, <span className="text-sunset-deep italic dark:text-gold">mándala a cocina.</span>
                </h2>
                <p className={`mt-3 max-w-2xl text-[15px] leading-relaxed ${TEXT_MUTED}`}>
                  Toca una mesa, agrega platillos del menú y presiona “Enviar a cocina”. Cada mesa guarda su comanda
                  hasta que la envíes.
                </p>
              </div>

              <DemoToolbar
                onCleared={() => {
                  drafts.clearAll()
                  setLastSent(null)
                }}
              />

              <section aria-labelledby={mesasHeadingId} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <h2 id={mesasHeadingId} className={`font-display text-2xl ${TEXT_STRONG}`}>
                    Mesas
                  </h2>
                  <ul aria-label="Resumen de pedidos" className="flex flex-wrap gap-2">
                    {counts.map(({ status, total }) => (
                      <li key={status} className="inline-flex items-center gap-1.5">
                        <StatusChip status={status} />
                        <span className={`text-sm font-semibold tabular-nums ${TEXT_STRONG}`}>{total}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <TableGrid
                  orders={orders}
                  draftCounts={drafts.counts}
                  selected={mesa}
                  compact={open && isDesktop}
                  onSelect={selectTable}
                  registerTile={registerTile}
                />
                <p className={`flex items-center gap-2 text-xs ${TEXT_MUTED}`}>
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-sunset dark:bg-gold" />
                  El punto junto al número indica una comanda sin enviar.
                </p>
              </section>
            </div>

            {/* Escritorio: panel lateral fijo junto a las mesas. */}
            <AnimatePresence mode="popLayout">
              {isDesktop && panel ? (
                <motion.section
                  key="panel-mesa"
                  aria-labelledby={panelHeadingId}
                  initial={{ opacity: 0, x: 32 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 32, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="sticky top-4 h-[calc(100svh-2rem)] min-h-[32rem] min-w-0 overflow-hidden rounded-3xl border border-deep/10 shadow-[0_24px_60px_-30px_rgb(19_50_74/0.55)] dark:border-white/10 dark:shadow-none"
                >
                  <motion.div
                    key={mesa}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="h-full"
                  >
                    {panel}
                  </motion.div>
                </motion.section>
              ) : null}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </div>

      {/* Móvil y tableta: hoja a pantalla completa con botón para volver. */}
      <AnimatePresence>
        {!isDesktop && panel ? (
          <MobileSheet key="hoja-mesa" labelledBy={panelHeadingId} onClose={closePanel}>
            {panel}
          </MobileSheet>
        ) : null}
      </AnimatePresence>
    </StaffLayout>
  )
}
