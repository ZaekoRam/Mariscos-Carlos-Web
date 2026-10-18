import { useMemo } from 'react'
import en from '../data/menu.en.json'
import { formatMXN, hasPriceVariants, MENU, type MenuCategory, type MenuItem } from '../lib/menu'
import type { OrderLine } from '../lib/lines'
import { useLang, type Lang } from './lang'

/** Traducción al inglés de menu.json (los ids, precios y opciones salen del menú en español). */
interface MenuEnglish {
  notas: { temporada: string; facturacion: string; preparacion_larga: string }
  glosario: { termino: string; descripcion: string }[]
  guarniciones: string[]
  categorias: Record<string, { nombre: string; notas?: string[] }>
  secciones: Record<string, string>
  grupos: Record<string, string>
  valores: Record<string, string>
  items: Record<string, { nombre: string; descripcion?: string }>
}

const EN = en as MenuEnglish

/** "8 pzas" → "8 pcs", "400 a 500 g" → "400–500 g". */
function portionEn(porcion: string): string {
  return porcion
    .replace(/\bpzas\b/g, 'pcs')
    .replace(/\bpza\b/g, 'pc')
    .replace(/(\d)\s+a\s+(\d)/g, '$1–$2')
}

export function menuText(lang: Lang) {
  const isEn = lang === 'en'
  const value = (v: string) => (isEn ? (EN.valores[v] ?? v) : v)
  const group = (g: string) => (isEn ? (EN.grupos[g] ?? g) : g)

  return {
    lang,
    notas: isEn ? EN.notas : MENU.notas,
    glosario: isEn ? EN.glosario : MENU.glosario,
    guarniciones: isEn ? EN.guarniciones : MENU.guarniciones,
    categoryName: (c: MenuCategory) => (isEn ? (EN.categorias[c.id]?.nombre ?? c.nombre) : c.nombre),
    categoryNotes: (c: MenuCategory) => (isEn ? (EN.categorias[c.id]?.notas ?? c.notas ?? []) : (c.notas ?? [])),
    section: (s: string) => (isEn ? (EN.secciones[s] ?? s) : s),
    itemName: (item: Pick<MenuItem, 'id' | 'nombre'>) => (isEn ? (EN.items[item.id]?.nombre ?? item.nombre) : item.nombre),
    itemDescription: (item: MenuItem) => (isEn ? (EN.items[item.id]?.descripcion ?? item.descripcion) : item.descripcion),
    portion: (porcion?: string) => (porcion ? (isEn ? portionEn(porcion) : porcion) : undefined),
    group,
    value,
    /** "$240", "$500 por kilo" / "$500 per kg", "Desde $50" / "From $50". */
    price: (item: MenuItem) => {
      if (item.por_kilo) return isEn ? `${formatMXN(item.precio)} per kg` : (item.precio_texto ?? `${formatMXN(item.precio)} por kilo`)
      if (hasPriceVariants(item)) return `${isEn ? 'From' : 'Desde'} ${formatMXN(item.precio)}`
      return formatMXN(item.precio)
    },
    /** Título de una línea del carrito en el idioma actual (el mensaje de WhatsApp sigue en español). */
    lineTitle: (line: Pick<OrderLine, 'itemId' | 'nombre' | 'porcion' | 'opcionesTexto' | 'seleccion'>) => {
      const name = isEn ? (EN.items[line.itemId]?.nombre ?? line.nombre) : line.nombre
      const portion = line.porcion ? (isEn ? portionEn(line.porcion) : line.porcion) : ''
      const options = isEn ? Object.values(line.seleccion ?? {}).map(value).join(', ') : line.opcionesTexto
      const base = portion ? `${name} ${portion}` : name
      return options ? `${base} · ${options}` : base
    },
  }
}

export type MenuText = ReturnType<typeof menuText>

export function useMenuText(): MenuText {
  const { lang } = useLang()
  return useMemo(() => menuText(lang), [lang])
}
