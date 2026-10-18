/**
 * Datos del negocio. Son la única fuente de verdad para teléfonos, horarios,
 * redes y calificaciones: no escribas estos datos a mano en los componentes.
 */
export const SITE = {
  nombre: 'Mariscos Carlos',
  tagline: 'Los mejores platillos del mar',
  /** Lema y año de apertura, tomados del logo oficial ("Los Más Frescos · Desde 2004"). */
  lema: 'Los más frescos',
  desde: 2004,
  ciudad: 'Manzanillo, Colima',
  direccion: 'Atún esq. León Marino, Manzanillo, Colima',
  referencia: 'Está en la zona de la Central de Autobuses, detrás de la central.',
  mapsUrl: 'https://www.google.com/maps/place/Mariscos+Carlos',
  whatsapp: {
    /** Número en formato internacional para wa.me (sin + ni espacios). */
    numero: '523141498733',
    display: '+52 1 314 149 8733',
  },
  telefono: {
    href: 'tel:+523143365458',
    display: '314 336 5458',
  },
  email: 'mariscoscarlosmzo@gmail.com',
  calificacion: {
    google: 4.6,
    /** Número aproximado de reseñas en Google. */
    resenasGoogle: 2980,
    resenasGoogleTexto: '~2,980',
    facebookRecomienda: 96,
  },
  rangoPrecio: '$$',
  servicios: ['Consumo en el lugar', 'Terraza y mesas al aire libre', 'Retiro en el negocio'],
  redes: {
    facebook: 'https://www.facebook.com/mariscoscarlosmzo/',
    instagram: 'https://www.instagram.com/mariscoscarlosmzo/',
  },
  /** Zona horaria para calcular si el restaurante está abierto. */
  timeZone: 'America/Mexico_City',
  /** Mesas del restaurante (QR, demo de mesero). */
  totalMesas: 12,
  /**
   * Dominio público usado en los códigos QR (por ejemplo "https://mariscoscarlos.mx").
   * Si queda vacío se usa el dominio desde donde se abre la página.
   */
  publicUrl: '',
} as const

/** URL base para los códigos QR, sin diagonal final. */
export function getPublicBaseUrl(): string {
  const configured = SITE.publicUrl.trim().replace(/\/+$/, '')
  if (configured) return configured
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
