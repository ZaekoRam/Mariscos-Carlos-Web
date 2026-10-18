import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
import { SITE } from '../../config/site'
import { SpanishOnly, useLang } from '../../i18n/lang'
import logo from '../../assets/logo.svg'
import { ChefIcon, InfoIcon, TableIcon } from '../icons'

/** Aviso obligatorio en las pantallas de personal: es un demo con datos de ejemplo. */
export function DemoBanner() {
  const { t } = useLang()
  return (
    <div role="note" className="bg-gold px-4 py-2 text-center text-sm font-semibold text-deep">
      <span className="inline-flex items-center gap-2">
        <InfoIcon className="size-4 shrink-0" />
        {t('Demo — datos de ejemplo', 'Demo — sample data')}
        <span className="hidden font-normal sm:inline">
          {t('· Los pedidos sólo viven en este navegador.', '· Orders only live in this browser.')}
        </span>
      </span>
    </div>
  )
}

/**
 * Marco de las pantallas de personal (/mesero, /cocina): aviso de demo, barra con
 * navegación entre pantallas y contenido. Soporta modo oscuro del sistema.
 */
export function StaffLayout({ title, children }: { title: string; children: ReactNode }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-deep text-white dark:bg-gold dark:text-deep'
        : 'text-deep hover:bg-deep/5 dark:text-foam dark:hover:bg-white/10'
    }`

  return (
    <SpanishOnly>
      <div className="min-h-svh bg-foam text-ink dark:bg-[#0B1C2A] dark:text-foam">
        <DemoBanner />
        <header className="border-b border-deep/10 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logo} alt="" className="size-8" width={32} height={32} />
              <span className="font-display text-lg text-deep dark:text-foam">{SITE.nombre}</span>
              <span className="sr-only">— volver al inicio</span>
            </Link>
            <nav aria-label="Pantallas del demo" className="flex items-center gap-1">
              <NavLink to="/mesero" className={linkClass}>
                <TableIcon className="size-4" />
                Mesero
              </NavLink>
              <NavLink to="/cocina" className={linkClass}>
                <ChefIcon className="size-4" />
                Cocina
              </NavLink>
            </nav>
          </div>
        </header>
        <main id="contenido" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
          <h1 className="sr-only">{title}</h1>
          {children}
        </main>
      </div>
    </SpanishOnly>
  )
}
