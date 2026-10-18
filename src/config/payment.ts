/**
 * Datos para pago por transferencia.
 *
 * IMPORTANTE: son marcadores de posición. Mientras un campo esté vacío, la página
 * muestra "Pendiente de confirmar" y desactiva el botón de copiar de ese campo.
 * Reemplázalos sólo con los datos que confirme el restaurante.
 */
export const PAYMENT = {
  banco: '',
  clabe: '',
  titular: '',
}

export const PAYMENT_PENDING_LABEL = 'Pendiente de confirmar'

export type PaymentField = keyof typeof PAYMENT

/** Valor confirmado de un campo, o null si sigue pendiente. */
export function getPaymentValue(field: PaymentField): string | null {
  const value = PAYMENT[field].trim()
  return value ? value : null
}

/** true sólo cuando banco, CLABE y titular ya fueron confirmados. */
export function isPaymentConfirmed(): boolean {
  return (Object.keys(PAYMENT) as PaymentField[]).every((field) => getPaymentValue(field) !== null)
}
