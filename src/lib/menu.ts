import menuData from '../data/menu.json'

/** Grupo de opciones de un platillo (por ejemplo "Preparación": Ajo, Ajillo...). */
export interface OptionGroup {
  nombre: string
  valores: string[]
  /** Costo extra en MXN por valor (los valores que no aparecen cuestan 0). */
  extra?: Record<string, number>
}

export interface MenuItem {
  id: string
  nombre: string
  /** Porción o tamaño, por ejemplo "250 g", "8 pzas", "355 mL". */
  porcion?: string
  descripcion?: string
  /** Precio en MXN. En productos por kilo es el precio por kilo. */
  precio: number
  por_kilo?: boolean
  /** Texto de precio para productos por kilo, por ejemplo "$500 por kilo". */
  precio_texto?: string
  temporada?: boolean
  /** Marcado con reloj en el menú impreso: tarda más en prepararse. */
  preparacion_larga?: boolean
  /** Subtítulo dentro de la categoría, por ejemplo "Zarandeados". */
  seccion?: string
  opciones?: OptionGroup[]
}

export interface MenuCategory {
  id: string
  nombre: string
  notas?: string[]
  items: MenuItem[]
}

export interface MenuData {
  moneda: 'MXN'
  fuente: string
  notas: { temporada: string; facturacion: string; preparacion_larga: string }
  glosario: { termino: string; descripcion: string }[]
  guarniciones: string[]
  categorias: MenuCategory[]
}

export const MENU = menuData as MenuData
export const CATEGORIES: MenuCategory[] = MENU.categorias
export const ALL_ITEMS: MenuItem[] = CATEGORIES.flatMap((c) => c.items)

const ITEMS_BY_ID = new Map(ALL_ITEMS.map((item) => [item.id, item]))
const CATEGORY_BY_ITEM_ID = new Map(CATEGORIES.flatMap((c) => c.items.map((item) => [item.id, c] as const)))

export function findItem(id: string): MenuItem | undefined {
  return ITEMS_BY_ID.get(id)
}

export function findCategoryOfItem(id: string): MenuCategory | undefined {
  return CATEGORY_BY_ITEM_ID.get(id)
}

/** Selección de opciones: nombre del grupo → valor elegido. */
export type Selection = Record<string, string>

/** Selección inicial: el primer valor de cada grupo. */
export function defaultSelection(item: MenuItem): Selection {
  const selection: Selection = {}
  for (const group of item.opciones ?? []) {
    if (group.valores.length > 0) selection[group.nombre] = group.valores[0]
  }
  return selection
}

/** Costo extra de la selección (por ejemplo, proteína en ensaladas). */
export function selectionExtra(item: MenuItem, selection: Selection): number {
  let extra = 0
  for (const group of item.opciones ?? []) {
    const value = selection[group.nombre]
    if (value && group.extra?.[value]) extra += group.extra[value]
  }
  return extra
}

/** Precio unitario con extras. null para productos por kilo (el total depende del peso). */
export function unitPrice(item: MenuItem, selection: Selection): number | null {
  if (item.por_kilo) return null
  return item.precio + selectionExtra(item, selection)
}

/** true si algún valor de opción cambia el precio (para mostrar "Desde $50"). */
export function hasPriceVariants(item: MenuItem): boolean {
  return (item.opciones ?? []).some((g) => g.extra && Object.values(g.extra).some((v) => v > 0))
}

/** Valores elegidos en orden, por ejemplo ["Salmón", "Ajo"]. */
export function selectionValues(item: MenuItem, selection: Selection): string[] {
  return (item.opciones ?? []).map((g) => selection[g.nombre]).filter((v): v is string => Boolean(v))
}

/** Etiqueta corta de la selección, por ejemplo "Salmón, Ajo". Cadena vacía si no hay opciones. */
export function selectionLabel(item: MenuItem, selection: Selection): string {
  return selectionValues(item, selection).join(', ')
}

/** Clave estable de una línea de carrito: mismo platillo + mismas opciones = misma línea. */
export function lineKey(itemId: string, selection: Selection): string {
  const parts = Object.keys(selection)
    .sort()
    .map((k) => `${k}=${selection[k]}`)
  return parts.length ? `${itemId}|${parts.join('|')}` : itemId
}

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

/** Formato de precio: 1240 → "$1,240". */
export function formatMXN(amount: number): string {
  return MXN.format(amount)
}

/** Texto de precio para tarjetas: "$240", "$500 por kilo" o "Desde $50". */
export function priceLabel(item: MenuItem): string {
  if (item.por_kilo) return item.precio_texto ?? `${formatMXN(item.precio)} por kilo`
  if (hasPriceVariants(item)) return `Desde ${formatMXN(item.precio)}`
  return formatMXN(item.precio)
}

/** Nombre completo con porción, por ejemplo "Orden de pulpo (280 g)". */
export function itemDisplayName(item: Pick<MenuItem, 'nombre' | 'porcion'>): string {
  return item.porcion ? `${item.nombre} (${item.porcion})` : item.nombre
}

/** Normaliza texto para búsquedas: minúsculas y sin acentos. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Busca por nombre (sin distinguir acentos ni mayúsculas). */
export function matchesSearch(item: MenuItem, query: string): boolean {
  const q = normalizeText(query)
  if (!q) return true
  return normalizeText(item.nombre).includes(q)
}

/** Agrupa los platillos por `seccion`, respetando el orden del menú. */
export function groupBySection(items: MenuItem[]): { seccion: string | null; items: MenuItem[] }[] {
  const groups: { seccion: string | null; items: MenuItem[] }[] = []
  for (const item of items) {
    const seccion = item.seccion ?? null
    const last = groups[groups.length - 1]
    if (last && last.seccion === seccion) last.items.push(item)
    else groups.push({ seccion, items: [item] })
  }
  return groups
}
