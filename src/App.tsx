import { MotionConfig } from 'motion/react'
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { EASE } from './lib/motion'
import Home from './pages/Home'
import { LangProvider } from './i18n/lang'
import { CartProvider } from './store/cart'

// Pantallas del demo (personal y seguimiento): se cargan sólo cuando se visitan.
const Mesero = lazy(() => import('./pages/Mesero'))
const Cocina = lazy(() => import('./pages/Cocina'))
const Pedido = lazy(() => import('./pages/Pedido'))
const QrPage = lazy(() => import('./pages/QrPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageFallback() {
  return (
    <div className="grid min-h-svh place-items-center bg-foam text-deep/70" role="status">
      Cargando…
    </div>
  )
}

/** Red de seguridad: un error de render o de efecto muestra un aviso en vez de una página en blanco. */
class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Error en la aplicación', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="grid min-h-svh place-items-center bg-foam px-4 text-center text-deep">
        <div className="max-w-sm">
          <p className="font-display text-2xl">Algo salió mal al cargar la página.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex min-h-11 items-center rounded-full bg-sunset-deep px-6 font-semibold text-white"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}

export default function App() {
  return (
    <BrowserRouter>
      {/* reducedMotion="user": respeta prefers-reduced-motion en todas las animaciones de motion. */}
      <MotionConfig reducedMotion="user" transition={{ ease: EASE }}>
        <LangProvider>
        <CartProvider>
          <AppErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/mesero" element={<Mesero />} />
                <Route path="/cocina" element={<Cocina />} />
                <Route path="/pedido/:orderId" element={<Pedido />} />
                <Route path="/qr" element={<QrPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AppErrorBoundary>
        </CartProvider>
        </LangProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}
