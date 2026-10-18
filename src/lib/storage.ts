/**
 * Acceso a localStorage / sessionStorage que nunca lanza errores.
 * En modo privado, con cookies bloqueadas o en vistas previas el acceso puede fallar:
 * la app sigue funcionando sólo en memoria.
 */

type StorageKind = 'local' | 'session'

function getStorage(kind: StorageKind): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function safeGetItem(key: string, kind: StorageKind = 'local'): string | null {
  try {
    return getStorage(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string, kind: StorageKind = 'local'): boolean {
  try {
    const storage = getStorage(kind)
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key: string, kind: StorageKind = 'local'): void {
  try {
    getStorage(kind)?.removeItem(key)
  } catch {
    // Sin almacenamiento disponible: no hay nada que borrar.
  }
}

/** Lee y parsea JSON. Devuelve `fallback` si no existe, está corrupto o el almacenamiento falla. */
export function readJSON<T>(key: string, fallback: T, kind: StorageKind = 'local'): T {
  const raw = safeGetItem(key, kind)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown, kind: StorageKind = 'local'): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value), kind)
  } catch {
    return false
  }
}

/** Claves de almacenamiento usadas por la app (todas con el mismo prefijo). */
export const STORAGE_KEYS = {
  cart: 'mariscos-carlos:carrito',
  orders: 'mariscos-carlos:pedidos',
  announcementDismissed: 'mariscos-carlos:aviso-cerrado',
  meseroDrafts: 'mariscos-carlos:mesero-borradores',
} as const
