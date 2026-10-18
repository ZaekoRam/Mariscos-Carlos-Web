import {
  formatMXN,
  lineKey,
  selectionLabel,
  unitPrice,
  type MenuItem,
  type Selection,
} from './menu'

/**
 * Una línea de pedido (carrito del cliente, comanda del mesero o pedido en cocina).
 * Guarda los datos del platillo copiados para que el pedido no cambie si cambia el menú.
 */
export interface OrderLine {
  /** Platillo + opciones. Dos líneas con la misma clave se suman. */
  key: string
  itemId: string
  nombre: string
  porcion?: string
  seleccion: Selection
  /** Opciones elegidas en texto, por ejemplo "Salmón, Ajo". Vacío si no tiene opciones. */
  opcionesTexto: string
  cantidad: number
  /** Precio unitario con extras. null en productos por kilo. */
  precioUnitario: number | null
  /** Texto de precio para productos por kilo, por ejemplo "$500 por kilo". */
  precioTexto?: string
}

export function createLine(item: MenuItem, selection: Selection, cantidad = 1): OrderLine {
  return {
    key: lineKey(item.id, selection),
    itemId: item.id,
    nombre: item.nombre,
    porcion: item.porcion,
    seleccion: { ...selection },
    opcionesTexto: selectionLabel(item, selection),
    cantidad,
    precioUnitario: unitPrice(item, selection),
    precioTexto: item.por_kilo ? item.precio_texto : undefined,
  }
}

/** Agrega una línea a la lista: si ya existe la misma clave, suma la cantidad. */
export function addLine(lines: OrderLine[], line: OrderLine): OrderLine[] {
  const existing = lines.find((l) => l.key === line.key)
  if (!existing) return [...lines, line]
  return lines.map((l) => (l.key === line.key ? { ...l, cantidad: l.cantidad + line.cantidad } : l))
}

/** Cambia la cantidad; si queda en 0 o menos, elimina la línea. */
export function setLineQuantity(lines: OrderLine[], key: string, cantidad: number): OrderLine[] {
  if (cantidad <= 0) return lines.filter((l) => l.key !== key)
  return lines.map((l) => (l.key === key ? { ...l, cantidad } : l))
}

/** Número total de platillos. */
export function linesCount(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + l.cantidad, 0)
}

/** Total de los productos con precio fijo (los productos por kilo no se suman). */
export function linesTotal(lines: OrderLine[]): number {
  return lines.reduce((sum, l) => sum + (l.precioUnitario ?? 0) * l.cantidad, 0)
}

/** Subtotal de una línea, o null si es por kilo. */
export function lineSubtotal(line: OrderLine): number | null {
  return line.precioUnitario === null ? null : line.precioUnitario * line.cantidad
}

/** true si hay productos por kilo (su precio final depende del peso). */
export function hasPerKiloLines(lines: OrderLine[]): boolean {
  return lines.some((l) => l.precioUnitario === null)
}

/** "Orden de pulpo 280 g · Ajo" */
export function lineTitle(line: Pick<OrderLine, 'nombre' | 'porcion' | 'opcionesTexto'>): string {
  const base = line.porcion ? `${line.nombre} ${line.porcion}` : line.nombre
  return line.opcionesTexto ? `${base} · ${line.opcionesTexto}` : base
}

/** Precio de una línea para mostrar: "$480", "$240 c/u" o "$500 por kilo". */
export function linePriceText(line: OrderLine): string {
  if (line.precioUnitario === null) return line.precioTexto ?? 'Precio por kilo'
  if (line.cantidad > 1) return `${formatMXN(line.precioUnitario)} c/u`
  return formatMXN(line.precioUnitario)
}

/** Texto del total: "$960" o "$960 + productos por kilo". */
export function totalText(lines: OrderLine[]): string {
  const total = formatMXN(linesTotal(lines))
  return hasPerKiloLines(lines) ? `${total} + productos por kilo` : total
}
