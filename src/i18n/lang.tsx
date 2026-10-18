import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { safeGetItem, safeSetItem } from '../lib/storage'

/**
 * Idioma de la parte pública (landing, carrito, reservas, seguimiento de pedido).
 * Las pantallas del personal (mesero, cocina, QR) y los mensajes de WhatsApp quedan en español,
 * porque los lee el restaurante.
 */
export type Lang = 'es' | 'en'

const KEY = 'mariscos-carlos:idioma'

interface LangContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Devuelve el texto en el idioma actual: t('Reservar', 'Book a table'). */
  t: (es: string, en: string) => string
}

const LangContext = createContext<LangContextValue>({ lang: 'es', setLang: () => {}, t: (es) => es })

function initialLang(): Lang {
  try {
    const param = new URLSearchParams(window.location.search).get('lang')
    if (param === 'en' || param === 'es') return param
  } catch {
    // Sin URL disponible: se usa lo guardado.
  }
  const stored = safeGetItem(KEY)
  if (stored === 'en' || stored === 'es') return stored
  // Sin preferencia guardada: un navegador en inglés (turistas) abre la página en inglés.
  try {
    if (navigator.language?.toLowerCase().startsWith('en')) return 'en'
  } catch {
    // Sin navigator: español.
  }
  return 'es'
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'es-MX'
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    safeSetItem(KEY, next)
  }, [])

  const t = useCallback((es: string, en: string) => (lang === 'en' ? en : es), [lang])
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

const SPANISH_ONLY: LangContextValue = { lang: 'es', setLang: () => {}, t: (es) => es }

/** Fuerza español (pantallas del personal: mesero, cocina, QR). */
export function SpanishOnly({ children }: { children: ReactNode }) {
  return <LangContext.Provider value={SPANISH_ONLY}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  return useContext(LangContext)
}
