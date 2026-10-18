import { useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { isScrollLocked, onScrollLockChange } from '../lib/scrollLock'

/**
 * Desplazamiento suave con inercia (Lenis) para la landing.
 * - Se desactiva con prefers-reduced-motion y en pantallas táctiles (el scroll nativo del celular
 *   ya tiene inercia y así no se gasta el hilo principal en cada cuadro).
 * - Los enlaces #ancla se animan con compensación del encabezado fijo.
 * - No interfiere con diálogos (carrito, menú móvil, ficha de pago) ni con contenedores
 *   que tengan data-lenis-prevent; se pausa cuando algo bloquea el scroll del body.
 */
export function useSmoothScroll() {
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce || typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) return
    // Se descarga aparte (sólo escritorio), fuera del paquete inicial.
    let cancelled = false
    let cleanup = () => {}
    import('lenis')
      .then(({ default: Lenis }) => {
        if (cancelled) return
        const lenis = new Lenis({
          autoRaf: true,
          lerp: 0.12,
          smoothWheel: true,
          anchors: { offset: -88, duration: 1.2 },
          prevent: (node) => Boolean(node.closest('[role="dialog"], [data-lenis-prevent]')),
        })

        // Mientras haya una ventana abierta (librito, carrito, menú móvil, ficha de pago) Lenis se pausa;
        // se reanuda cuando se cierra la última.
        const sync = (locked: boolean) => {
          if (locked) lenis.stop()
          else lenis.start()
        }
        sync(isScrollLocked())
        const off = onScrollLockChange(sync)
        cleanup = () => {
          off()
          lenis.destroy()
        }
      })
      .catch(() => {
        // Sin scroll suave: queda el nativo.
      })

    return () => {
      cancelled = true
      cleanup()
    }
  }, [reduce])
}
