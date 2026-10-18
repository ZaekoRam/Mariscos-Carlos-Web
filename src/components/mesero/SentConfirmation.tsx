import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { EASE } from '../../lib/motion'
import { ArrowRightIcon, CheckIcon, ChefIcon, CloseIcon } from '../icons'

/** Tarjeta de confirmación después de "Enviar a cocina". */
export default function SentConfirmation({
  orderId,
  mesa,
  onDismiss,
}: {
  orderId: string
  mesa: number
  onDismiss: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest' })
  }, [orderId])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative mx-4 mt-4 overflow-hidden rounded-3xl bg-deep p-5 text-foam shadow-[0_18px_40px_-24px_rgb(19_50_74/0.7)] sm:mx-5 dark:border dark:border-gold/40"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-sunset/25 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gold text-deep">
            <CheckIcon className="size-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] text-gold uppercase">Enviado a cocina · Mesa {mesa}</p>
            <p className="mt-1 font-display text-2xl">
              Pedido <span className="italic">{orderId}</span>
            </p>
            <p className="mt-1 text-sm text-foam/80">Ya aparece en la pantalla de cocina como “Pendiente”.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar aviso de pedido enviado"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foam hover:bg-white/10"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>
      <div className="relative mt-4 flex flex-wrap gap-2">
        <Link
          to={'/pedido/' + orderId}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-deep transition-colors hover:bg-gold/90"
        >
          Ver estado del pedido
          <ArrowRightIcon className="size-4" />
        </Link>
        <Link
          to="/cocina"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-foam/30 px-4 text-sm font-semibold text-foam transition-colors hover:bg-white/10"
        >
          <ChefIcon className="size-4" />
          Ver en cocina
        </Link>
      </div>
    </motion.div>
  )
}
