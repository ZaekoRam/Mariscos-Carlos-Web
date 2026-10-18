import { motion } from 'motion/react'
import { useLang } from '../../i18n/lang'
import { EASE } from '../../lib/motion'
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from '../../store/orders'

const STATUS_LABEL_EN: Record<OrderStatus, string> = {
  pendiente: 'Received',
  preparacion: 'Being prepared',
  listo: 'Ready',
}

/**
 * Barra de progreso del pedido: Pendiente → En preparación → Listo.
 * Se usa en /pedido/:id, en el panel ?mesa=N y en el demo de mesero.
 */
export function OrderProgress({
  status,
  size = 'md',
  tone = 'light',
}: {
  status: OrderStatus
  size?: 'sm' | 'md'
  tone?: 'light' | 'dark'
}) {
  const { lang, t } = useLang()
  const label = (s: OrderStatus) => (lang === 'en' ? STATUS_LABEL_EN[s] : STATUS_LABEL[s])
  const index = ORDER_STATUSES.indexOf(status)
  const percent = (index / (ORDER_STATUSES.length - 1)) * 100
  const dark = tone === 'dark'
  const done = status === 'listo'

  return (
    <div
      role="progressbar"
      aria-label={t('Estado del pedido', 'Order status')}
      aria-valuemin={1}
      aria-valuemax={ORDER_STATUSES.length}
      aria-valuenow={index + 1}
      aria-valuetext={label(status)}
      className="w-full"
    >
      <div className={`relative w-full overflow-hidden rounded-full ${size === 'sm' ? 'h-1.5' : 'h-2.5'} ${dark ? 'bg-white/15' : 'bg-deep/10'}`}>
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${done ? 'bg-emerald-600' : 'bg-ocean'}`}
          initial={false}
          animate={{ width: `${Math.max(percent, 6)}%` }}
          transition={{ duration: 0.8, ease: EASE }}
        />
      </div>
      <ol className={`mt-2 grid grid-cols-3 ${size === 'sm' ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
        {ORDER_STATUSES.map((s, i) => {
          const reached = i <= index
          const current = i === index
          return (
            <li
              key={s}
              aria-current={current ? 'step' : undefined}
              className={`flex items-center gap-1.5 ${i === 1 ? 'justify-center' : i === 2 ? 'justify-end' : 'justify-start'} ${
                reached ? (dark ? 'text-foam' : 'text-deep') : dark ? 'text-foam/75' : 'text-deep/75'
              } ${current ? 'font-semibold' : ''}`}
            >
              <span
                aria-hidden="true"
                className={`size-2 shrink-0 rounded-full ${reached ? (done ? 'bg-emerald-600' : 'bg-ocean') : dark ? 'bg-white/25' : 'bg-deep/20'}`}
              />
              {label(s)}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
