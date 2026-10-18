/**
 * "Aviso del día": aparece arriba de la barra de navegación cuando `active` es true.
 * Úsalo para cierres por clima, días festivos o cambios de horario.
 *
 * - Cambia `id` cada vez que publiques un aviso nuevo: quien cerró el aviso anterior
 *   volverá a ver el nuevo.
 * - Pon `active: false` para ocultarlo.
 */
export const ANNOUNCEMENT = {
  active: true,
  id: 'aviso-ejemplo-1',
  text: 'Aviso de ejemplo: aquí avisamos cierres por clima o días festivos. Antes de venir, confirma por WhatsApp.',
  /** Texto en inglés (si queda vacío se muestra el texto en español). */
  textEn: 'Sample notice: this is where we post closures for weather or holidays. Please confirm on WhatsApp before you come.',
}
