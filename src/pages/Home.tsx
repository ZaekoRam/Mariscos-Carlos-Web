import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import CartButton from '../components/cart/CartButton'
import TableStatusPanel from '../components/orders/TableStatusPanel'
import { useLang } from '../i18n/lang'
import HeroCinematic from '../landing/HeroCinematic'
import Preloader from '../landing/Preloader'
import QuickBar from '../landing/QuickBar'
import SiteHeader from '../landing/SiteHeader'
import { useSmoothScroll } from '../landing/useSmoothScroll'

// Orden por importancia: primero lo que viene a hacer el cliente (menú, pedir, reservar),
// después el local (nosotros, reseñas, ubicación). Todo debajo del hero se carga diferido.
const MenuBook = lazy(() => import('../landing/MenuBook'))
const Favorites = lazy(() => import('../landing/Favorites'))
const OrderSection = lazy(() => import('../landing/OrderSection'))
const Reservation = lazy(() => import('../landing/Reservation'))
const Ribbons = lazy(() => import('../landing/Ribbons'))
const VideoBand = lazy(() => import('../landing/VideoBand'))
const About = lazy(() => import('../landing/About'))
const Marquee = lazy(() => import('../landing/Marquee'))
const ReviewsBand = lazy(() => import('../landing/ReviewsBand'))
const Visit = lazy(() => import('../landing/Visit'))
const FooterGrand = lazy(() => import('../landing/FooterGrand'))
const CartDrawer = lazy(() => import('../components/cart/CartDrawer'))

function SectionFallback({ dark = false }: { dark?: boolean }) {
  return <div data-section-fallback="" className={`min-h-[80vh] ${dark ? 'bg-night' : 'bg-foam'}`} aria-hidden="true" />
}

/** ¿Queda algún marcador de sección por cargar antes del elemento? (moverá el ancla al llegar) */
function hasPendingFallbackBefore(el: HTMLElement) {
  const pending = document.querySelectorAll('[data-section-fallback]')
  for (const node of pending) {
    if (node.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) return true
  }
  return false
}

/**
 * Las secciones se cargan de forma diferida, así que un enlace con #ancla (por ejemplo
 * /#menu desde /mesero) puede llegar antes de que exista el elemento: se reintenta un momento.
 */
function useScrollToHash() {
  const { hash } = useLocation()
  useEffect(() => {
    if (!hash) return
    let id = hash.slice(1)
    try {
      id = decodeURIComponent(id)
    } catch {
      // Hash mal codificado (p. ej. /#100%): se usa tal cual en lugar de romper la página.
    }
    let tries = 0
    let timer = 0
    const attempt = () => {
      const el = document.getElementById(id)
      if (el && (tries >= 40 || !hasPendingFallbackBefore(el))) {
        el.scrollIntoView({ block: 'start' })
        return
      }
      if (tries++ < 40) timer = window.setTimeout(attempt, 100)
    }
    attempt()
    return () => window.clearTimeout(timer)
  }, [hash])
}

/**
 * Las secciones de abajo se montan cuando el navegador queda libre después del primer pintado
 * (o en cuanto la persona toca o desliza), así el hero aparece primero y sin competir por el
 * hilo principal. Si se llega con un #ancla, se montan de inmediato.
 */
function useBelowFoldReady() {
  const [ready, setReady] = useState(() => typeof window === 'undefined' || window.location.hash.length > 1)
  useEffect(() => {
    if (ready) return
    const go = () => setReady(true)
    const events = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }))
    // Safari no tiene requestIdleCallback: ahí basta con un temporizador corto.
    const hasIdle = typeof window.requestIdleCallback === 'function'
    let idle = 0
    const raf = requestAnimationFrame(() => {
      idle = hasIdle ? window.requestIdleCallback(go, { timeout: 1500 }) : setTimeout(go, 600)
    })
    return () => {
      events.forEach((e) => window.removeEventListener(e, go))
      cancelAnimationFrame(raf)
      if (hasIdle) window.cancelIdleCallback(idle)
      else clearTimeout(idle)
    }
  }, [ready])
  return ready
}

export default function Home() {
  const { t } = useLang()
  useScrollToHash()
  useSmoothScroll()
  const belowFold = useBelowFoldReady()

  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-[95] rounded-full bg-deep px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('Saltar al contenido', 'Skip to content')}
      </a>
      <Preloader />
      <SiteHeader />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <HeroCinematic />
        {belowFold ? (
          <>
            <Suspense fallback={<SectionFallback />}>
              <MenuBook />
            </Suspense>
            <Suspense fallback={<SectionFallback dark />}>
              <Favorites />
              <OrderSection />
            </Suspense>
            <Suspense fallback={<SectionFallback />}>
              <Reservation />
              <Ribbons />
            </Suspense>
            <Suspense fallback={<SectionFallback dark />}>
              <VideoBand />
              <About />
              <Marquee />
              <ReviewsBand />
              <Visit />
            </Suspense>
          </>
        ) : (
          <SectionFallback />
        )}
      </main>
      {belowFold ? (
        <Suspense fallback={null}>
          <FooterGrand />
        </Suspense>
      ) : null}
      <TableStatusPanel />
      <CartButton />
      <QuickBar />
      {belowFold ? (
        <Suspense fallback={null}>
          <CartDrawer />
        </Suspense>
      ) : null}
    </>
  )
}
