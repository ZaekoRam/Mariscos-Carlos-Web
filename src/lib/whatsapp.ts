import { SITE } from '../config/site'
import { formatIsoDateLong } from './hours'
import { lineTitle, linePriceText, totalText, type OrderLine } from './lines'

/** Enlace wa.me al WhatsApp del restaurante, con mensaje opcional. */
export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${SITE.whatsapp.numero}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** Abre WhatsApp en una pestaña nueva con el mensaje. */
export function openWhatsApp(message?: string): void {
  try {
    window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer')
  } catch {
    window.location.href = whatsappUrl(message)
  }
}

/** Mensaje genérico para los botones "Pedir por WhatsApp" cuando el carrito está vacío. */
export const GENERIC_ORDER_MESSAGE = 'Hola, quiero hacer un pedido.'

export type OrderMode =
  | { tipo: 'mesa'; mesa: number }
  | { tipo: 'local' }
  | { tipo: 'llevar' }

export function orderModeLabel(mode: OrderMode): string {
  switch (mode.tipo) {
    case 'mesa':
      return `Mesa: ${mode.mesa}`
    case 'local':
      return 'Consumo en el lugar'
    case 'llevar':
      return 'Para llevar (retiro en el negocio)'
  }
}

export interface OrderMessageInput {
  lines: OrderLine[]
  mode: OrderMode
  notas?: string
  nombre?: string
}

/**
 * Mensaje de pedido, por ejemplo:
 *
 * Hola, quiero hacer un pedido:
 * - 2 x Orden de aguachile de camarón 220 g · Rojo ($240 c/u)
 * - 1 x Pulpo zarandeado 300 g ($480)
 * Mesa: 3 · Total estimado: $960
 * Notas: sin cebolla
 */
export function buildOrderMessage({ lines, mode, notas, nombre }: OrderMessageInput): string {
  const out: string[] = ['Hola, quiero hacer un pedido:']
  for (const line of lines) {
    const price =
      line.precioUnitario === null ? `${linePriceText(line)}, peso por confirmar` : linePriceText(line)
    out.push(`- ${line.cantidad} x ${lineTitle(line)} (${price})`)
  }
  out.push(`${orderModeLabel(mode)} · Total estimado: ${totalText(lines)}`)
  const name = nombre?.trim()
  if (name) out.push(`A nombre de: ${name}`)
  const notes = notas?.trim()
  if (notes) out.push(`Notas: ${notes}`)
  return out.join('\n')
}

export interface ReservationInput {
  nombre: string
  personas: number
  /** "YYYY-MM-DD" */
  fecha: string
  /** "HH:MM" */
  hora: string
  comentario?: string
}

export function buildReservationMessage({ nombre, personas, fecha, hora, comentario }: ReservationInput): string {
  const out = [
    'Hola, quiero reservar una mesa:',
    `Nombre: ${nombre.trim()}`,
    `Personas: ${personas}`,
    `Fecha: ${formatIsoDateLong(fecha)}`,
    `Hora: ${hora}`,
  ]
  const note = comentario?.trim()
  if (note) out.push(`Comentario: ${note}`)
  out.push('¿Me confirman disponibilidad? Gracias.')
  return out.join('\n')
}

/** Concepto de pago: "Mesa 3 – Ana". */
export function paymentConcept(mesa: number | null, nombre: string): string {
  const mesaText = mesa ? `Mesa ${mesa}` : 'Mesa [N]'
  const nameText = nombre.trim() || '[nombre]'
  return `${mesaText} – ${nameText}`
}

export function buildPaymentMessage(concepto: string, monto?: string): string {
  const out = ['Hola, ya realicé mi pago por transferencia.', `Concepto: ${concepto}`]
  const amount = monto?.trim()
  if (amount) out.push(`Monto: ${amount}`)
  out.push('Les comparto mi comprobante.')
  return out.join('\n')
}
