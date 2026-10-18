import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { formatMXN } from '../../lib/menu'
import { buttonTap, EASE } from '../../lib/motion'
import { useCart } from '../../store/cart'
import { BagIcon } from '../icons'
import { useLang } from '../../i18n/lang'

/** Texto accesible del botón: "Ver pedido: 3 platillos, total estimado $960". */
function cartSummaryLabel(count: number, total: number, hasPerKilo: boolean, en = false): string {
  if (en) {
    const dishes = count === 1 ? '1 dish' : `${count} dishes`
    const kiloEn = hasPerKilo ? ' plus items sold by the kilo' : ''
    return `View order: ${dishes}, estimated total ${formatMXN(total)}${kiloEn}`
  }
  const platillos = count === 1 ? '1 platillo' : `${count} platillos`
  const kilo = hasPerKilo ? ' más productos por kilo' : ''
  return `Ver pedido: ${platillos}, total estimado ${formatMXN(total)}${kilo}`
}

/**
 * Botón flotante del pedido (abajo a la derecha). Sólo aparece cuando hay platillos
 * y rebota un poco cada vez que se agrega uno.
 */
export default function CartButton() {
  const { count, total, hasPerKilo, openCart, isOpen, lastAdded } = useCart()
  const { lang, t } = useLang()
  const reduceMotion = useReducedMotion()
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const bumpAt = lastAdded?.at ?? 0

  useEffect(() => {
    if (!bumpAt || reduceMotion || !scope.current) return
    const controls = animate(scope.current, { scale: [1, 1.12, 0.96, 1] }, { duration: 0.55, ease: EASE })
    return () => controls.stop()
  }, [bumpAt, reduceMotion, animate, scope])

  const visible = count > 0

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="cart-button"
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.9 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 max-md:hidden"
        >
          <span ref={scope} className="block origin-bottom-right">
            <motion.button
              type="button"
              onClick={openCart}
              data-cart-button
              whileTap={buttonTap}
              aria-label={cartSummaryLabel(count, total, hasPerKilo, lang === 'en')}
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              className="group relative isolate flex h-14 max-w-[11.5rem] items-center gap-2.5 overflow-hidden rounded-full bg-sunset-deep py-2 pr-4 pl-2 text-white shadow-[0_18px_36px_-14px_rgb(169_57_26/0.75)] ring-1 ring-white/15 transition-colors duration-300 before:pointer-events-none before:absolute before:top-px before:left-[10%] before:h-4 before:w-[80%] before:rounded-xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:content-[''] before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-sunset-darker hover:before:scale-x-[1.18] md:max-w-none md:pr-5"
            >
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                <BagIcon className="size-5" />
                <motion.span
                  key={bumpAt}
                  initial={reduceMotion || !bumpAt ? false : { scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] leading-none font-bold text-deep tabular-nums ring-2 ring-sunset-deep"
                >
                  {count > 99 ? '99+' : count}
                </motion.span>
              </span>
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="hidden text-[11px] font-semibold tracking-[0.14em] text-white uppercase md:block">
                  {t('Ver pedido', 'View order')}
                </span>
                <span className="flex items-baseline gap-1 truncate text-base font-semibold tabular-nums">
                  {formatMXN(total)}
                  {hasPerKilo ? <span className="text-xs font-medium text-white">+ kg</span> : null}
                </span>
              </span>
            </motion.button>
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
