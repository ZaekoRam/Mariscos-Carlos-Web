import { useEffect, useState } from 'react'
import { SITE } from '../config/site'

/** 0 = domingo … 6 = sábado (como Date.getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface DaySchedule {
  dia: Weekday
  nombre: string
  /** null = cerrado ese día. Horas en formato 24 h "HH:MM". */
  abre: string | null
  cierra: string | null
}

/** Horario semanal, en el orden en que se muestra (lunes a domingo). */
export const SCHEDULE: DaySchedule[] = [
  { dia: 1, nombre: 'Lunes', abre: '12:00', cierra: '19:00' },
  { dia: 2, nombre: 'Martes', abre: null, cierra: null },
  { dia: 3, nombre: 'Miércoles', abre: '12:00', cierra: '19:00' },
  { dia: 4, nombre: 'Jueves', abre: '12:00', cierra: '19:00' },
  { dia: 5, nombre: 'Viernes', abre: '12:00', cierra: '19:00' },
  { dia: 6, nombre: 'Sábado', abre: '12:00', cierra: '19:00' },
  { dia: 0, nombre: 'Domingo', abre: '12:00', cierra: '19:00' },
]

export const HOURS_SUMMARY = 'Lunes y de miércoles a domingo, 12:00 a 19:00. Martes cerrado.'
export const OPEN_TIME = '12:00'
export const CLOSE_TIME = '19:00'
export const CLOSED_WEEKDAY: Weekday = 2

const WEEKDAY_FROM_SHORT: Record<string, Weekday> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export interface ZonedNow {
  weekday: Weekday
  /** Minutos desde la medianoche en la zona horaria del restaurante. */
  minutes: number
  /** Fecha "YYYY-MM-DD" en la zona horaria del restaurante. */
  isoDate: string
}

/** Día y hora actuales en America/Mexico_City, sin depender de la zona del dispositivo. */
export function getZonedNow(date: Date = new Date(), timeZone: string = SITE.timeZone): ZonedNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  const hour = Number(get('hour')) % 24
  const minute = Number(get('minute'))
  return {
    weekday: WEEKDAY_FROM_SHORT[get('weekday')] ?? 0,
    minutes: hour * 60 + minute,
    isoDate: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function getDaySchedule(weekday: Weekday): DaySchedule {
  return SCHEDULE.find((d) => d.dia === weekday) ?? SCHEDULE[0]
}

export interface OpenStatus {
  isOpen: boolean
  /** Etiqueta corta: "Abierto ahora" o "Cerrado ahora". */
  label: 'Abierto ahora' | 'Cerrado ahora'
  /** Detalle, por ejemplo "Cierra a las 19:00" o "Abre mañana a las 12:00". */
  detail: string
  today: DaySchedule
}

/** Estado abierto/cerrado calculado con la hora de America/Mexico_City. */
export function getOpenStatus(date: Date = new Date()): OpenStatus {
  const now = getZonedNow(date)
  const today = getDaySchedule(now.weekday)

  if (today.abre && today.cierra) {
    const opens = toMinutes(today.abre)
    const closes = toMinutes(today.cierra)
    if (now.minutes >= opens && now.minutes < closes) {
      return { isOpen: true, label: 'Abierto ahora', detail: `Cierra a las ${today.cierra}`, today }
    }
    if (now.minutes < opens) {
      return { isOpen: false, label: 'Cerrado ahora', detail: `Abre hoy a las ${today.abre}`, today }
    }
  }

  for (let offset = 1; offset <= 7; offset++) {
    const next = getDaySchedule(((now.weekday + offset) % 7) as Weekday)
    if (next.abre) {
      const when = offset === 1 ? 'mañana' : `el ${next.nombre.toLowerCase()}`
      return { isOpen: false, label: 'Cerrado ahora', detail: `Abre ${when} a las ${next.abre}`, today }
    }
  }
  return { isOpen: false, label: 'Cerrado ahora', detail: '', today }
}

/** Estado abierto/cerrado que se actualiza solo (cada 30 s por defecto). */
export function useOpenStatus(intervalMs = 30_000): OpenStatus {
  const [status, setStatus] = useState(() => getOpenStatus())
  useEffect(() => {
    const id = window.setInterval(() => setStatus(getOpenStatus()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return status
}

/** Fecha "YYYY-MM-DD" de hoy en la zona del restaurante (para el mínimo del input de fecha). */
export function todayIsoInRestaurantZone(): string {
  return getZonedNow().isoDate
}

/** Día de la semana de una fecha "YYYY-MM-DD" (fecha de calendario, sin zona horaria). */
export function weekdayOfIsoDate(isoDate: string): Weekday | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  if (Number.isNaN(date.getTime())) return null
  return date.getUTCDay() as Weekday
}

/** "2026-10-17" → "sábado 17 de octubre de 2026". */
export function formatIsoDateLong(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return isoDate
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12))
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** true si "HH:MM" está dentro del horario: desde las 12:00 y antes de las 19:00. */
export function isTimeWithinHours(hhmm: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return false
  const minutes = toMinutes(hhmm)
  return minutes >= toMinutes(OPEN_TIME) && minutes < toMinutes(CLOSE_TIME)
}

/** Horarios para reservar cada 30 minutos: "12:00", "12:30" … "18:30". */
export const RESERVATION_SLOTS: string[] = (() => {
  const slots: string[] = []
  for (let m = toMinutes(OPEN_TIME); m < toMinutes(CLOSE_TIME); m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return slots
})()
