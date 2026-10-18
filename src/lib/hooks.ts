import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { SITE } from '../config/site'

/** Convierte "3" en 3 si es una mesa válida (1 a 12); si no, null. */
export function parseMesa(value: string | null | undefined): number | null {
  if (!value) return null
  if (!/^\d{1,2}$/.test(value.trim())) return null
  const n = Number(value)
  return n >= 1 && n <= SITE.totalMesas ? n : null
}

/** Número de mesa tomado de ?mesa=N (null si no hay o no es válido). */
export function useMesaParam(): number | null {
  const [params] = useSearchParams()
  return parseMesa(params.get('mesa'))
}

/** Hora actual que se actualiza cada `intervalMs` (para tiempos transcurridos). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

/** "hace 3 min", "hace 1 h 05 min" — tiempo transcurrido desde `since`. */
export function formatElapsed(since: number, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((now - since) / 1000))
  if (totalSeconds < 60) return `${totalSeconds} s`
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

/** Hora corta en la zona del restaurante: "14:35". */
export function formatClock(timestamp: number): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: SITE.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(timestamp))
}
