/**
 * Bloqueo de scroll compartido por todas las ventanas (librito del menú, carrito, menú móvil,
 * ficha de pago, hoja del mesero).
 *
 * Antes cada ventana guardaba el estado del body al abrir y lo "restauraba" al cerrar. Si una
 * se abría mientras otra todavía cerraba (por ejemplo, del librito al carrito), la segunda
 * guardaba "bloqueado" y, al cerrar, dejaba la página bloqueada para siempre.
 *
 * Ahora es un contador: el scroll se bloquea con la primera ventana y sólo se libera cuando
 * se cierra la última. Lenis (scroll suave) escucha estos cambios con onScrollLockChange.
 */

let count = 0
let savedOverflow = ''
let savedPaddingRight = ''
const listeners = new Set<(locked: boolean) => void>()

function notify() {
  const locked = count > 0
  listeners.forEach((fn) => fn(locked))
}

export function isScrollLocked(): boolean {
  return count > 0
}

/** Bloquea el scroll del body. Devuelve la función para liberarlo (se puede llamar más de una vez). */
export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {}
  const body = document.body
  if (count === 0) {
    savedOverflow = body.style.overflow === 'hidden' ? '' : body.style.overflow
    savedPaddingRight = body.style.paddingRight
    // Compensa la barra de desplazamiento de escritorio para que el contenido no "salte".
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
  }
  count += 1
  notify()

  let released = false
  return () => {
    if (released) return
    released = true
    count = Math.max(0, count - 1)
    if (count === 0) {
      body.style.overflow = savedOverflow
      body.style.paddingRight = savedPaddingRight
    }
    notify()
  }
}

/** Avisa cuando el scroll pasa de libre a bloqueado o al revés. */
export function onScrollLockChange(fn: (locked: boolean) => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
