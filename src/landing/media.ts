/**
 * Videos e imágenes de la landing.
 *
 * - Videos: Mixkit (licencia gratuita, uso comercial sin atribución). Se cargan desde su CDN;
 *   para producción conviene descargarlos a /public/media y cambiar las rutas aquí.
 * - Fotos: Unsplash (licencia Unsplash, uso comercial sin atribución). Son ILUSTRATIVAS:
 *   reemplázalas por fotos reales de los platillos del restaurante cuando las tengan.
 */

const mixkit = (id: number, quality: 360 | 720 | 1080 = 720) => `https://assets.mixkit.co/videos/${id}/${id}-${quality}.mp4`

export interface VideoAsset {
  src: string
  poster: string
  /** Versión ligera para celular (360p, ~1 MB en vez de ~5 MB). */
  srcSmall?: string
  /** Póster ligero para celular. */
  posterSmall?: string
}

export const VIDEOS = {
  /** Playa dorada con rocas y olas al atardecer (hero). */
  // Póster local en WebP (se precarga en index.html): es lo primero que se pinta.
  hero: { src: mixkit(1085), srcSmall: mixkit(1085, 360), poster: '/media/hero-poster.webp', posterSmall: '/media/hero-poster-640.webp' },
  /** Olas llegando a la arena, de cerca (franja "la carta"). */
  shore: { src: mixkit(1925), srcSmall: mixkit(1925, 360), poster: '/media/shore-poster.webp', posterSmall: '/media/shore-poster-640.webp' },
  /** Sol sobre el mar al atardecer (pedir / reservar). */
  sunset: { src: mixkit(4119), srcSmall: mixkit(4119, 360), poster: '/media/sunset-poster.webp', posterSmall: '/media/sunset-poster-640.webp' },
  /** Palmeras al atardecer (visítanos). */
  palms: { src: mixkit(2168), srcSmall: mixkit(2168, 360), poster: '/media/palms-poster.webp', posterSmall: '/media/palms-poster-640.webp' },
} satisfies Record<string, VideoAsset>

const UNSPLASH = {
  aguachile: '1595531507616-1f5347ee003b',
  coctel: '1626663011352-cacdcfe333f8',
  campechana: '1626663011519-b42e5ee10056',
  pulpo: '1626232441076-a2a5ada2256a',
  pulpoCamaron: '1783705956232-a3001ee91440',
  tostadas: '1601579110733-f654670d8c30',
  tacos: '1624300629298-e9de39c13be5',
  ceviche: '1533658266890-8bd362930725',
  palapa: '1520483601560-389dff434fdf',
  muelle: '1774656299241-7724832bcb45',
  cerveza: '1674770637078-22980292371f',
  pulpoFresco: '1485827329522-c625acce0067',
  tacosMargarita: '1731090389571-79158024b42a',
  mejillones: '1578935149228-66b184c83e69',
} as const

export type PhotoKey = keyof typeof UNSPLASH

/** URL de una foto con el ancho pedido (Unsplash entrega AVIF/WebP automáticamente). */
export function photo(key: PhotoKey, width = 1200): string {
  return `https://images.unsplash.com/photo-${UNSPLASH[key]}?auto=format&fit=crop&w=${width}&q=72`
}

/** srcset con varios anchos para imágenes responsivas. */
export function photoSrcSet(key: PhotoKey, widths: number[] = [480, 800, 1200, 1600]): string {
  return widths.map((w) => `${photo(key, w)} ${w}w`).join(', ')
}

/**
 * Fotos reales del restaurante, tomadas de su Instagram (@mariscoscarlosmzo) y recortadas
 * para quitar los textos de las publicaciones. Viven en /public/media/real.
 */
export const REAL = {
  fachada: { src: '/media/real/fachada.webp', alt: 'Fachada de Mariscos Carlos con palmeras', width: 1080, height: 620 },
  fachadaVertical: { src: '/media/real/fachada-vertical.webp', alt: 'Entrada de Mariscos Carlos entre palmeras', width: 650, height: 905 },
  aguachile: { src: '/media/real/aguachile-verde.webp', alt: 'Aguachile verde de camarón con aguacate y cebolla morada servido en Mariscos Carlos', width: 780, height: 610 },
  camarones: { src: '/media/real/camarones.webp', alt: 'Camarones empanizados con arroz y ensalada de col en Mariscos Carlos', width: 1080, height: 810 },
  coctel: { src: '/media/real/coctel.webp', alt: 'Coctel de camarón con aguacate y galletas saladas', width: 633, height: 479 },
} as const

export type RealKey = keyof typeof REAL

/** Texto alternativo de cada foto (describe la imagen, no afirma que sea del restaurante). */
export const PHOTO_ALT: Record<PhotoKey, string> = {
  aguachile: 'Aguachile de camarón con pepino y cebolla morada',
  coctel: 'Coctel de camarón en copa con el mar de fondo',
  campechana: 'Coctel de mariscos servido en vaso',
  pulpo: 'Tentáculos de pulpo a la parrilla',
  pulpoCamaron: 'Pulpo y camarones cocidos con hojas verdes',
  tostadas: 'Tostadas de mariscos con pepino y rábano',
  tacos: 'Tacos de camarón con aguacate',
  ceviche: 'Ceviche de pescado con cebolla morada',
  palapa: 'Palapa junto a la playa entre palmeras',
  muelle: 'Mesas de madera junto al mar',
  cerveza: 'Botella de cerveza fría sobre la mesa',
  pulpoFresco: 'Pulpo fresco sobre hielo',
  tacosMargarita: 'Tacos de mariscos con una margarita',
  mejillones: 'Plato de mariscos con mejillones y pulpo',
}
