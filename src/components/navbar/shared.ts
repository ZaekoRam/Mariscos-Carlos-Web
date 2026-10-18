import { lockScroll } from '../../lib/scrollLock'
import { useEffect, useState, type RefObject } from 'react'

export interface NavLinkItem {
  id: string
  label: string
}

/** Enlaces principales de la barra (anclas de la página de inicio). */
export const NAV_LINKS: readonly NavLinkItem[] = [
  { id: 'menu', label: 'Menú' },
  { id: 'como-pedir', label: 'Cómo pedir' },
  { id: 'reservar', label: 'Reservar' },
  { id: 'ubicacion', label: 'Ubicación' },
]

/** Desplazamiento (px) a partir del cual la barra se vuelve más opaca. */
export const SCROLL_THRESHOLD = 40

/**
 * Sección actualmente visible (entre las de NAV_LINKS) o null.
 * Las secciones se cargan de forma diferida: en cada cálculo se vuelven a buscar por id,
 * así que no importa si todavía no existen al montar la barra.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  const key = ids.join('|')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const list = key.split('|')
    let frame = 0

    const compute = () => {
      frame = 0
      // Línea de referencia: un poco debajo de la barra fija.
      const line = Math.min(window.innerHeight * 0.35, 220)
      let current: string | null = null
      for (const id of list) {
        const el = document.getElementById(id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= line && rect.bottom > line) {
          current = id
          break
        }
      }
      setActive((prev) => (prev === current ? prev : current))
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(compute)
    }

    schedule()
    // Recalcula después de que carguen las secciones diferidas.
    const late = window.setTimeout(schedule, 1200)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('hashchange', schedule)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.clearTimeout(late)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('hashchange', schedule)
    }
  }, [key])

  return active
}

/**
 * Bloquea el scroll del documento. Devuelve una función que restaura los valores
 * anteriores; es idempotente (se puede llamar más de una vez sin efecto extra).
 */
export function lockBodyScroll(): () => void {
  return lockScroll()
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Elementos enfocables visibles dentro de un contenedor (para la trampa de foco). */
export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getClientRects().length > 0,
  )
}

/** Divide el nombre del negocio para resaltar la última palabra en itálica ("Mariscos *Carlos*"). */
export function splitBrandName(name: string): { lead: string; accent: string } {
  const words = name.trim().split(/\s+/)
  if (words.length < 2) return { lead: '', accent: name.trim() }
  const accent = words.pop() ?? ''
  return { lead: words.join(' '), accent }
}

/** Variable CSS con la altura real del encabezado fijo (aviso del día + barra). */
export const HEADER_HEIGHT_VAR = '--header-h'

/**
 * Publica la altura del encabezado fijo en document.documentElement (--header-h) y la
 * mantiene al día con ResizeObserver (p. ej. cuando el aviso se cierra o cambia de líneas).
 * El hero y el scroll-mt de las secciones la usan para que nada quede debajo de la barra.
 */
export function useHeaderHeightVar(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || typeof document === 'undefined') return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty(HEADER_HEIGHT_VAR, `${Math.ceil(el.getBoundingClientRect().height)}px`)
    }
    update()
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(update)
      observer.observe(el)
    } else {
      window.addEventListener('resize', update)
    }
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
      root.style.removeProperty(HEADER_HEIGHT_VAR)
    }
  }, [ref])
}
