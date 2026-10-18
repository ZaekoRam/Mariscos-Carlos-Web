import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { useState } from 'react'
import { BagIcon, CalendarIcon } from '../components/icons'
import { useLang } from '../i18n/lang'
import { formatMXN } from '../lib/menu'
import { EASE } from '../lib/motion'
import { useCart } from '../store/cart'

function BookGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5v-13ZM20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5v-13Z" />
    </svg>
  )
}

/**
 * Barra fija inferior en el celular con las tres acciones principales (menú, reservar, pedido).
 * Aparece al salir del hero, que ya muestra esas mismas acciones.
 */
export default function QuickBar() {
  const { t } = useLang()
  const { count, total, hasPerKilo, openCart } = useCart()
  const { scrollY } = useScroll()
  const [visible, setVisible] = useState(false)

  useMotionValueEvent(scrollY, 'change', (y) => setVisible(y > window.innerHeight * 0.75))

  const item = 'flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-xs leading-none font-semibold tracking-wide transition-colors'

  return (
    <AnimatePresence>
      {visible ? (
        <motion.nav
          aria-label={t('Acciones rápidas', 'Quick actions')}
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 flex gap-1.5 rounded-[1.4rem] border border-white/10 bg-night/85 p-1.5 text-foam shadow-[0_20px_50px_-15px_rgb(0_0_0/0.7)] backdrop-blur-xl md:hidden"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <a href="#menu" className={`${item} hover:bg-white/10 active:bg-white/10`}>
            <BookGlyph className="size-5" />
            {t('Menú', 'Menu')}
          </a>
          <a href="#reservar" className={`${item} hover:bg-white/10 active:bg-white/10`}>
            <CalendarIcon className="size-5" />
            {t('Reservar', 'Book')}
          </a>
          {count > 0 ? (
            <button type="button" onClick={openCart} className={`${item} bg-sunset-deep text-white active:bg-sunset-darker`}>
              <span className="flex items-center gap-1.5">
                <BagIcon className="size-5" />
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] leading-none text-sunset-deep tabular-nums">{count}</span>
              </span>
              {formatMXN(total)}
              {hasPerKilo ? ' + kg' : ''}
            </button>
          ) : (
            <a href="#pedir" className={`${item} bg-sunset-deep text-white active:bg-sunset-darker`}>
              <BagIcon className="size-5" />
              {t('Pedir', 'Order')}
            </a>
          )}
        </motion.nav>
      ) : null}
    </AnimatePresence>
  )
}
