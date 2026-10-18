import { motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n/lang'

/** Conversación de ejemplo que se escribe dentro del teléfono del hero. */
const DEFAULT_MESSAGES = [
  '¿Tienen mesa para 4?',
  '¡Claro! Te esperamos hoy.',
  'Pedido: 5 aguachiles',
  'Tu pedido ya está listo.',
]

const DEFAULT_MESSAGES_EN = [
  'Do you have a table for 4?',
  'Of course! See you today.',
  'Order: 5 aguachiles',
  'Your order is ready.',
]

const TYPE_MS = 100
const DELETE_MS = 50
const PAUSE_MS = 2000
/** Con movimiento reducido: cada mensaje completo se muestra este tiempo. */
const STATIC_SWAP_MS = 3500

/** true mientras la pestaña está visible (se pausa al cambiar de pestaña). */
function usePageVisible() {
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
  )
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

/**
 * Mensajes que se escriben y borran letra por letra (100 ms por letra, 50 ms al borrar,
 * 2 s de pausa) en un ciclo infinito. Es decorativo (aria-hidden).
 * - Con prefers-reduced-motion: muestra cada mensaje completo y cambia cada pocos segundos,
 *   sin escritura letra por letra ni cursor parpadeante.
 * - Se pausa cuando está fuera de pantalla o la pestaña está oculta.
 */
export default function TypingMessages({
  messages: messagesProp,
  className = '',
  textClassName = '',
  onMessageChange,
}: {
  messages?: string[]
  /** Clases del contenedor (posición, ancho). */
  className?: string
  /** Clases extra para el texto. */
  textClassName?: string
  /** Se llama con el índice del mensaje actual cada vez que cambia. */
  onMessageChange?: (index: number) => void
}) {
  const { lang } = useLang()
  const messages = messagesProp ?? (lang === 'en' ? DEFAULT_MESSAGES_EN : DEFAULT_MESSAGES)
  const reduce = useReducedMotion() ?? false
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { amount: 0.1 })
  const pageVisible = usePageVisible()
  const active = inView && pageVisible

  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const total = messages.length
  const safeIndex = total > 0 ? index % total : 0
  const current = total > 0 ? Array.from(messages[safeIndex]) : []

  // Avisa al contenedor (por ejemplo, para cambiar el lado de la burbuja).
  const callbackRef = useRef(onMessageChange)
  useEffect(() => {
    callbackRef.current = onMessageChange
  }, [onMessageChange])
  useEffect(() => {
    callbackRef.current?.(safeIndex)
  }, [safeIndex])

  const currentLength = current.length

  useEffect(() => {
    if (!active || total === 0) return
    let timer = 0

    if (reduce) {
      timer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % total)
      }, STATIC_SWAP_MS)
      return () => window.clearTimeout(timer)
    }

    if (!deleting) {
      if (length < currentLength) {
        timer = window.setTimeout(() => setLength((l) => l + 1), TYPE_MS)
      } else {
        timer = window.setTimeout(() => setDeleting(true), PAUSE_MS)
      }
    } else if (length > 0) {
      timer = window.setTimeout(() => setLength((l) => Math.max(0, l - 1)), DELETE_MS)
    } else {
      timer = window.setTimeout(() => {
        setDeleting(false)
        setIndex((i) => (i + 1) % total)
      }, DELETE_MS * 4)
    }
    return () => window.clearTimeout(timer)
  }, [active, reduce, deleting, length, currentLength, total])

  if (total === 0) return null

  const shown = reduce ? current.join('') : current.slice(0, Math.min(length, currentLength)).join('')

  return (
    <div ref={rootRef} aria-hidden="true" className={className}>
      <p
        className={`min-h-[1.5em] font-nokia text-[10px] leading-tight break-words text-[#13324A] sm:text-[14px] ${textClassName}`}
      >
        {shown}
        {reduce ? null : (
          <motion.span
            className="ml-1 inline-block h-3 w-1.5 bg-deep align-middle"
            initial={{ opacity: 0 }}
            animate={active ? { opacity: [0, 1, 0] } : { opacity: 1 }}
            transition={active ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
          />
        )}
      </p>
    </div>
  )
}
