import { useCallback, useSyncExternalStore } from 'react'

function matches(query: string): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  } catch {
    return false
  }
}

/** true mientras la media query se cumpla (se actualiza en vivo). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      try {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
        const mql = window.matchMedia(query)
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
      } catch {
        return () => {}
      }
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => matches(query),
    () => false,
  )
}

/** Escritorio: el panel de la mesa se muestra al lado de la cuadrícula. */
export const DESKTOP_QUERY = '(min-width: 1024px)'
/** Pantallas anchas: menú y comanda lado a lado dentro del panel. */
export const WIDE_QUERY = '(min-width: 1280px)'
export const DARK_QUERY = '(prefers-color-scheme: dark)'
