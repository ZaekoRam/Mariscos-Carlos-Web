import { AnimatePresence, motion } from 'motion/react'
import { useId, useRef } from 'react'
import {
  hasPerKiloLines,
  lineSubtotal,
  lineTitle,
  linePriceText,
  linesCount,
  totalText,
  type OrderLine,
} from '../../lib/lines'
import { formatMXN } from '../../lib/menu'
import { EASE } from '../../lib/motion'
import { CtaButton } from '../CtaButton'
import { ChefIcon, MinusIcon, PlusIcon, TrashIcon } from '../icons'
import { EYEBROW, ICON_BUTTON, SURFACE, TEXT_MUTED, TEXT_STRONG, platillosText } from './styles'

const STEP_BUTTON =
  'inline-flex size-10 items-center justify-center rounded-full text-deep transition-colors hover:bg-deep/5 dark:text-foam dark:hover:bg-white/10'

/** Comanda en borrador de una mesa: líneas, notas, total y "Enviar a cocina". */
export default function DraftTicket({
  mesa,
  lines,
  notas,
  onQuantity,
  onNotas,
  onClear,
  onSend,
}: {
  mesa: number
  lines: OrderLine[]
  notas: string
  onQuantity: (key: string, cantidad: number) => void
  onNotas: (notas: string) => void
  onClear: () => void
  onSend: () => void
}) {
  const notesId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const count = linesCount(lines)
  const empty = lines.length === 0

  const removeLine = (key: string) => {
    onQuantity(key, 0)
    headingRef.current?.focus({ preventScroll: true })
  }

  return (
    <div className="px-4 pt-4 sm:px-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={EYEBROW}>Mesa {mesa}</p>
          <h3 ref={headingRef} tabIndex={-1} className={`mt-1 font-display text-2xl ${TEXT_STRONG}`}>
            Comanda{' '}
            <span className={`font-sans text-sm font-medium ${TEXT_MUTED}`}>
              {empty ? '— vacía' : `· ${platillosText(count)}`}
            </span>
          </h3>
        </div>
        {!empty ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`¿Vaciar la comanda de la Mesa ${mesa}?`)) onClear()
            }}
            className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold underline-offset-4 hover:underline ${TEXT_MUTED}`}
          >
            <TrashIcon className="size-4" />
            Vaciar
          </button>
        ) : null}
      </div>

      {empty ? (
        <p
          className={`mt-4 rounded-2xl border border-dashed border-deep/20 px-4 py-6 text-center text-sm leading-relaxed dark:border-white/20 ${TEXT_MUTED}`}
        >
          Agrega platillos desde el menú. La comanda se guarda aunque recargues la página.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {lines.map((line) => {
              const title = lineTitle(line)
              const subtotal = lineSubtotal(line)
              return (
                <motion.li
                  key={line.key}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="rounded-2xl border border-deep/10 bg-white p-3 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className={`min-w-0 text-[15px] leading-snug font-medium ${TEXT_STRONG}`}>{title}</p>
                    <p className={`shrink-0 text-[15px] font-semibold tabular-nums ${TEXT_STRONG}`}>
                      {subtotal === null ? linePriceText(line) : formatMXN(subtotal)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="inline-flex items-center rounded-full border border-deep/15 dark:border-white/15">
                      <button
                        type="button"
                        onClick={() => (line.cantidad <= 1 ? removeLine(line.key) : onQuantity(line.key, line.cantidad - 1))}
                        aria-label={`Quitar uno: ${title}`}
                        className={STEP_BUTTON}
                      >
                        <MinusIcon className="size-4" />
                      </button>
                      <span className={`w-8 text-center text-sm font-semibold tabular-nums ${TEXT_STRONG}`}>
                        <span className="sr-only">Cantidad: </span>
                        {line.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => onQuantity(line.key, line.cantidad + 1)}
                        aria-label={`Agregar uno: ${title}`}
                        className={STEP_BUTTON}
                      >
                        <PlusIcon className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {line.cantidad > 1 && subtotal !== null ? (
                        <span className={`text-xs tabular-nums ${TEXT_MUTED}`}>{linePriceText(line)}</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        aria-label={`Eliminar ${title}`}
                        className={ICON_BUTTON}
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <div className="mt-4">
        <label htmlFor={notesId} className={`text-sm font-semibold ${TEXT_STRONG}`}>
          Notas para cocina <span className={`font-normal ${TEXT_MUTED}`}>(opcional)</span>
        </label>
        <textarea
          id={notesId}
          value={notas}
          onChange={(e) => onNotas(e.target.value)}
          rows={2}
          maxLength={240}
          placeholder="Ej. sin cebolla, salsa aparte"
          className="mt-1.5 w-full resize-y rounded-2xl border border-deep/15 bg-white px-4 py-3 text-[15px] text-deep placeholder:text-deep/70 dark:border-white/15 dark:bg-white/10 dark:text-foam dark:placeholder:text-foam/70"
        />
      </div>

      {/* Se queda pegado abajo mientras la comanda es larga; después se acomoda en su lugar. */}
      <div className={`sticky bottom-0 z-10 -mx-4 mt-3 border-t border-deep/10 px-4 pt-3 pb-4 sm:-mx-5 sm:px-5 dark:border-white/10 ${SURFACE}`}>
        <div className="flex items-baseline justify-between gap-3">
          <span className={`text-sm font-semibold ${TEXT_MUTED}`}>Total</span>
          <span className={`text-right font-display text-2xl tabular-nums ${TEXT_STRONG}`}>{totalText(lines)}</span>
        </div>
        {hasPerKiloLines(lines) ? (
          <p className={`mt-1 text-right text-xs ${TEXT_MUTED}`}>El precio de los productos por kilo depende del peso.</p>
        ) : null}
        <CtaButton
          variant="sunset"
          size="lg"
          onClick={onSend}
          disabled={empty}
          icon={<ChefIcon className="size-5" />}
          className="mt-3 w-full"
        >
          Enviar a cocina
        </CtaButton>
      </div>
    </div>
  )
}
