import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState, type Ref } from 'react'
import { createLine, lineTitle, linesCount, totalText, type OrderLine } from '../../lib/lines'
import type { MenuItem, Selection } from '../../lib/menu'
import { EASE } from '../../lib/motion'
import { useOrdersByMesa } from '../../store/orders'
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from '../icons'
import DraftTicket from './DraftTicket'
import MenuPicker from './MenuPicker'
import SentConfirmation from './SentConfirmation'
import StatusChip from './StatusChip'
import TableOrders from './TableOrders'
import { EYEBROW, ICON_BUTTON, SURFACE, TEXT_STRONG, platillosText, summarizeTable } from './styles'
import type { TableDraft } from './useDrafts'

type View = 'menu' | 'ticket'

/**
 * Panel de una mesa: menú para agregar platillos, comanda en borrador y pedidos enviados.
 * - `split`: menú y comanda lado a lado (pantallas anchas).
 * - Si no, una vista a la vez con un selector "Menú / Comanda".
 */
export default function OrderPanel({
  mesa,
  draft,
  dark,
  split,
  variant,
  headingId,
  headingRef,
  sentOrderId,
  onClose,
  onAdd,
  onQuantity,
  onNotas,
  onClear,
  onSend,
  onDismissSent,
}: {
  mesa: number
  draft: TableDraft
  dark: boolean
  split: boolean
  variant: 'side' | 'sheet'
  headingId: string
  headingRef: Ref<HTMLHeadingElement>
  sentOrderId: string | null
  onClose: () => void
  onAdd: (line: OrderLine) => void
  onQuantity: (key: string, cantidad: number) => void
  onNotas: (notas: string) => void
  onClear: () => void
  /** Envía la comanda y devuelve el id del pedido (o null si estaba vacía). */
  onSend: () => string | null
  onDismissSent: () => void
}) {
  const [view, setView] = useState<View>('menu')
  const [live, setLive] = useState({ text: '', n: 0 })
  const scrollRef = useRef<HTMLDivElement>(null)
  const orders = useOrdersByMesa(mesa)
  const { status } = summarizeTable(orders)
  const count = linesCount(draft.lines)

  const announce = (text: string) => setLive((prev) => ({ text, n: prev.n + 1 }))

  const switchView = (next: View) => {
    setView(next)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const handleAdd = (item: MenuItem, selection: Selection) => {
    const line = createLine(item, selection, 1)
    onAdd(line)
    announce(`Agregado a la Mesa ${mesa}: ${lineTitle(line)}`)
  }

  const handleSend = () => {
    const id = onSend()
    if (id) {
      announce(`Pedido ${id} enviado a cocina`)
      if (scrollRef.current) scrollRef.current.scrollTop = 0
    }
  }

  const ticketColumn = (
    <>
      <AnimatePresence initial={false}>
        {sentOrderId ? (
          <SentConfirmation key={sentOrderId} orderId={sentOrderId} mesa={mesa} onDismiss={onDismissSent} />
        ) : null}
      </AnimatePresence>
      <DraftTicket
        mesa={mesa}
        lines={draft.lines}
        notas={draft.notas}
        onQuantity={onQuantity}
        onNotas={onNotas}
        onClear={() => {
          onClear()
          announce(`Comanda de la Mesa ${mesa} vaciada`)
        }}
        onSend={handleSend}
      />
      <TableOrders mesa={mesa} dark={dark} />
    </>
  )

  const menu = <MenuPicker dark={dark} onAdd={handleAdd} />

  return (
    <div className={`flex h-full min-h-0 flex-col ${SURFACE}`}>
      <header className="flex items-center gap-3 border-b border-deep/10 px-4 py-3 sm:px-5 dark:border-white/10">
        {variant === 'sheet' ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Volver a las mesas"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-deep/15 pr-4 pl-3 text-sm font-semibold text-deep hover:bg-deep/5 dark:border-white/20 dark:text-foam dark:hover:bg-white/10"
          >
            <ArrowLeftIcon className="size-4" />
            Mesas
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className={EYEBROW}>Tomando la orden</p>
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className={`font-display text-3xl leading-tight ${TEXT_STRONG}`}>
            Mesa <span className="italic">{mesa}</span>
          </h2>
        </div>
        {status ? <StatusChip status={status} emphasize className="hidden min-[400px]:inline-flex" /> : null}
        {variant === 'side' ? (
          <button type="button" onClick={onClose} aria-label={`Cerrar Mesa ${mesa}`} className={ICON_BUTTON}>
            <CloseIcon className="size-4" />
          </button>
        ) : null}
      </header>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {live.text}
        {live.n % 2 ? ' ' : ''}
      </p>

      {split ? (
        <div className="grid min-h-0 flex-1 grid-cols-2">
          <div data-scroll-root className="min-h-0 overflow-y-auto overscroll-contain border-r border-deep/10 dark:border-white/10">
            {menu}
          </div>
          <div data-scroll-root ref={scrollRef} className="min-h-0 overflow-y-auto overscroll-contain">
            {ticketColumn}
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-deep/10 px-4 py-3 sm:px-5 dark:border-white/10">
            <div
              role="group"
              aria-label="Vista del panel"
              className="grid grid-cols-2 gap-1 rounded-full bg-deep/5 p-1 dark:bg-white/10"
            >
              {(['menu', 'ticket'] as const).map((v) => {
                const active = view === v
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={active}
                    onClick={() => switchView(v)}
                    className={`relative inline-flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${
                      active ? 'text-white dark:text-deep' : 'text-deep dark:text-foam'
                    }`}
                  >
                    {active ? (
                      <motion.span
                        layoutId={`mesero-vista-${mesa}`}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="absolute inset-0 rounded-full bg-deep dark:bg-gold"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="relative">{v === 'menu' ? 'Menú' : 'Comanda'}</span>
                    {v === 'ticket' && count > 0 ? (
                      <motion.span
                        key={count}
                        initial={{ scale: 1.35 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className={`relative inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs tabular-nums ${
                          active ? 'bg-white text-deep dark:bg-deep dark:text-foam' : 'bg-sunset-deep text-white'
                        }`}
                      >
                        {count}
                        <span className="sr-only"> {count === 1 ? 'platillo' : 'platillos'}</span>
                      </motion.span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div data-scroll-root ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div hidden={view !== 'menu'}>{menu}</div>
            <div hidden={view !== 'ticket'}>{ticketColumn}</div>
          </div>

          <AnimatePresence initial={false}>
            {view === 'menu' && count > 0 ? (
              <motion.div
                key="barra-comanda"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease: EASE }}
                className={`border-t border-deep/10 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 dark:border-white/10 ${SURFACE}`}
              >
                <button
                  type="button"
                  onClick={() => switchView('ticket')}
                  className="flex h-12 w-full items-center justify-between gap-3 rounded-full bg-deep pr-4 pl-5 text-sm font-semibold text-white transition-colors hover:bg-deep/90 dark:bg-gold dark:text-deep dark:hover:bg-gold/90"
                >
                  <span className="truncate">Ver comanda · {platillosText(count)}</span>
                  <span className="inline-flex shrink-0 items-center gap-2 tabular-nums">
                    {totalText(draft.lines)}
                    <ArrowRightIcon className="size-4" />
                  </span>
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
