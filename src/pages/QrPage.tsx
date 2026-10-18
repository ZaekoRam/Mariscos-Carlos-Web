import { Link } from 'react-router'
import logo from '../assets/logo.svg'
import { DemoBanner } from '../components/orders/StaffLayout'
import { SITE } from '../config/site'
import { SpanishOnly } from '../i18n/lang'
import QrSection from '../sections/QrSection'

/**
 * Herramienta para el restaurante: genera, descarga e imprime los QR de cada mesa.
 * Es una página aparte (no parte de la landing). La estructura <main> → #qr es la que
 * espera la hoja de impresión para imprimir sólo las tarjetas.
 */
export default function QrPage() {
  return (
    <SpanishOnly>
      <main id="contenido" className="min-h-svh bg-sand">
        <DemoBanner />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="" width={40} height={40} className="size-10" />
            <span className="font-display text-xl text-deep">{SITE.nombre}</span>
          </Link>
          <nav aria-label="Herramientas del demo" className="flex gap-4 text-sm font-semibold text-deep">
            <Link to="/mesero" className="hover:underline">Mesero</Link>
            <Link to="/cocina" className="hover:underline">Cocina</Link>
          </nav>
        </div>
        <h1 className="sr-only">Códigos QR de las mesas</h1>
        <QrSection />
      </main>
    </SpanishOnly>
  )
}
