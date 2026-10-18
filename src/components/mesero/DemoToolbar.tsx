import { useState } from 'react'
import { Link } from 'react-router'
import { clearOrders, seedDemoOrders } from '../../store/orders'
import { CtaButton } from '../CtaButton'
import { ExternalIcon, RefreshIcon, TrashIcon } from '../icons'
import { CARD, TEXT_MUTED, TEXT_STRONG } from './styles'

/** Herramientas del demo: cargar pedidos de ejemplo y borrar todo. */
export default function DemoToolbar({ onCleared }: { onCleared: () => void }) {
  const [live, setLive] = useState({ text: '', n: 0 })
  const announce = (text: string) => setLive((prev) => ({ text, n: prev.n + 1 }))

  return (
    <div className={`${CARD} flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between`}>
      <p className={`text-sm leading-relaxed ${TEXT_MUTED}`}>
        <span className={`mr-2 inline-block rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold tracking-[0.14em] text-deep uppercase`}>
          Tip
        </span>
        Abre{' '}
        <Link
          to="/cocina"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 font-semibold text-ocean-deep underline underline-offset-4 dark:text-gold"
        >
          /cocina
          <ExternalIcon className="size-3.5" />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </Link>{' '}
        en otra pestaña: <span className={`font-semibold ${TEXT_STRONG}`}>los pedidos aparecen al instante.</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <CtaButton
          variant="ocean"
          size="sm"
          icon={<RefreshIcon className="size-4" />}
          onClick={() => {
            seedDemoOrders()
            announce('Se cargaron pedidos de ejemplo')
          }}
        >
          Cargar pedidos de ejemplo
        </CtaButton>
        <CtaButton
          variant="outline"
          size="sm"
          icon={<TrashIcon className="size-4" />}
          className="dark:border-white/25 dark:text-foam dark:hover:bg-white/10"
          onClick={() => {
            if (!window.confirm('¿Borrar todos los pedidos y comandas del demo? Esta acción no se puede deshacer.')) return
            clearOrders()
            onCleared()
            announce('Datos del demo borrados')
          }}
        >
          Borrar datos del demo
        </CtaButton>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {live.text}
        {live.n % 2 ? ' ' : ''}
      </p>
    </div>
  )
}
