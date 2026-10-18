import { useEffect, useRef, type RefObject } from 'react'
import { lockScroll } from '../../lib/scrollLock'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0 && el.getAttribute('aria-hidden') !== 'true',
  )
}

/** ¿El elemento recibe foco por sí mismo (sin tabindex agregado)? */
function isNativelyFocusable(el: HTMLElement): boolean {
  return el.matches(FOCUSABLE) || el.hasAttribute('tabindex') || el.isContentEditable
}

/**
 * Enfoca un elemento. Si no es enfocable (por ejemplo, un título), le da
 * tabindex="-1" sólo mientras tiene el foco, para no alterar el orden de Tab.
 */
function focusElement(el: HTMLElement) {
  if (!isNativelyFocusable(el)) {
    el.setAttribute('tabindex', '-1')
    el.addEventListener('blur', () => el.removeAttribute('tabindex'), { once: true })
  }
  el.focus({ preventScroll: true })
}

/** Respaldo cuando no hay a dónde regresar el foco: el contenido principal. */
function defaultReturnFocus(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#contenido, main')
}

/**
 * Comportamiento de diálogo modal:
 * - mueve el foco adentro al abrir y lo regresa al elemento anterior al cerrar
 *   (o a un respaldo si ese elemento ya no existe: `getReturnFocus`),
 * - mantiene el foco atrapado dentro del panel (Tab / Shift+Tab),
 * - cierra con Escape,
 * - bloquea el scroll de la página mientras está abierto (y lo restaura).
 */
export function useDialog(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  initialFocusRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  /**
   * Decide a dónde regresa el foco al cerrar. Recibe el elemento que tenía el foco
   * al abrir; si devuelve null o un elemento desconectado, se usa el <main>.
   */
  getReturnFocus?: (previous: HTMLElement | null) => HTMLElement | null,
) {
  const onCloseRef = useRef(onClose)
  const getReturnFocusRef = useRef(getReturnFocus)
  useEffect(() => {
    onCloseRef.current = onClose
    getReturnFocusRef.current = getReturnFocus
  }, [onClose, getReturnFocus])

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null

    // Bloqueo de scroll compartido (se libera cuando se cierra la última ventana abierta).
    const unlockScroll = lockScroll()

    const frame = window.requestAnimationFrame(() => {
      const target = initialFocusRef.current ?? panelRef.current
      target?.focus({ preventScroll: true })
    })

    const onKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current
      if (!panel) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusableIn(panel)
      if (items.length === 0) {
        event.preventDefault()
        panel.focus({ preventScroll: true })
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = active instanceof Node && panel.contains(active)
      if (event.shiftKey) {
        if (!inside || active === first || active === panel || active === initialFocusRef.current) {
          event.preventDefault()
          last.focus()
        }
      } else if (!inside || active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Si el foco se escapa (por ejemplo, con un clic fuera), se regresa al panel.
    const onFocusIn = (event: FocusEvent) => {
      const panel = panelRef.current
      if (panel && event.target instanceof Node && !panel.contains(event.target)) {
        ;(initialFocusRef.current ?? panel).focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)

    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      unlockScroll()
      const panel = panelRef.current
      // En el siguiente cuadro: deja que el botón o el menú que abrió el diálogo
      // terminen de desmontarse antes de decidir a dónde regresa el foco.
      window.requestAnimationFrame(() => {
        const active = document.activeElement
        // Si el foco ya se movió a otro lugar de la página (fuera del panel), se respeta.
        if (active instanceof HTMLElement && active !== document.body && !(panel && panel.contains(active))) return
        const pick = getReturnFocusRef.current ? getReturnFocusRef.current(previouslyFocused) : previouslyFocused
        const target = pick?.isConnected ? pick : defaultReturnFocus()
        if (target) focusElement(target)
      })
    }
  }, [open, panelRef, initialFocusRef])
}
