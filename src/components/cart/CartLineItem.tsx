import { motion } from 'motion/react'
import { useLang } from '../../i18n/lang'
import { useMenuText } from '../../i18n/menuText'
import { lineSubtotal, linePriceText, type OrderLine } from '../../lib/lines'
import { formatMXN } from '../../lib/menu'
import { buttonTap, EASE } from '../../lib/motion'
import { MinusIcon, PlusIcon, TrashIcon } from '../icons'

const STEP_BUTTON =
  'relative flex size-10 shrink-0 items-center justify-center rounded-full text-deep transition-colors duration-200 after:absolute after:-inset-0.5 after:rounded-full hover:bg-deep/8 active:bg-deep/12'

/** Una línea del pedido con controles de cantidad. */
export default function CartLineItem({
  line,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  line: OrderLine
  onIncrement: (line: OrderLine) => void
  onDecrement: (line: OrderLine) => void
  onRemove: (line: OrderLine) => void
}) {
  const { t } = useLang()
  const { lineTitle } = useMenuText()
  const title = lineTitle(line)
  const perKgEn = (text?: string) => text?.replace(/\s*por kilo/i, ' per kg')
  const priceTextEn =
    line.precioUnitario === null
      ? (perKgEn(line.precioTexto) ?? 'Price per kg')
      : line.cantidad > 1
        ? `${formatMXN(line.precioUnitario)} each`
        : formatMXN(line.precioUnitario)
  const subtotal = lineSubtotal(line)
  const perKilo = line.precioUnitario === null
  const lastOne = line.cantidad <= 1

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 48, transition: { duration: 0.25, ease: EASE } }}
      transition={{ duration: 0.4, ease: EASE }}
      className="rounded-3xl border border-deep/10 bg-white/80 p-4 shadow-[0_14px_30px_-24px_rgb(19_50_74/0.5)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] leading-snug font-semibold text-pretty text-deep">{title}</p>
          <p className="mt-1 text-sm text-deep/75">
            {t(linePriceText(line), priceTextEn)}
            {perKilo ? <span className="text-deep/75"> · {t('peso por confirmar', 'weight to be confirmed')}</span> : null}
          </p>
        </div>
        <p className="shrink-0 text-right text-[15px] font-semibold text-deep tabular-nums">
          {subtotal !== null ? formatMXN(subtotal) : t(line.precioTexto ?? 'Por kilo', perKgEn(line.precioTexto) ?? 'Per kg')}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center rounded-full border border-deep/15 bg-foam p-0.5" role="group" aria-label={t(`Cantidad de ${title}`, `Quantity of ${title}`)}>
          <motion.button
            type="button"
            whileTap={buttonTap}
            onClick={() => onDecrement(line)}
            aria-label={
              lastOne
                ? t(`Quitar ${title} del pedido`, `Remove ${title} from your order`)
                : t(`Quitar uno de ${title}`, `Remove one ${title}`)
            }
            className={STEP_BUTTON}
          >
            {lastOne ? <TrashIcon className="size-4.5" /> : <MinusIcon className="size-4.5" />}
          </motion.button>
          <span
            aria-live="polite"
            aria-atomic="true"
            className="min-w-8 text-center text-base font-semibold text-deep tabular-nums"
          >
            <span className="sr-only">{t('Cantidad: ', 'Quantity: ')}</span>
            {line.cantidad}
          </span>
          <motion.button
            type="button"
            whileTap={buttonTap}
            onClick={() => onIncrement(line)}
            aria-label={t(`Agregar uno más de ${title}`, `Add one more ${title}`)}
            className={STEP_BUTTON}
          >
            <PlusIcon className="size-4.5" />
          </motion.button>
        </div>

        <button
          type="button"
          onClick={() => onRemove(line)}
          aria-label={t(`Eliminar ${title} del pedido`, `Delete ${title} from your order`)}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-deep/75 sm:h-10 transition-colors hover:bg-deep/5 hover:text-sunset-darker"
        >
          <TrashIcon className="size-4" />
          {t('Eliminar', 'Delete')}
        </button>
      </div>
    </motion.li>
  )
}
