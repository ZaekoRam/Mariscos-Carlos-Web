import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { ANNOUNCEMENT } from '../config/announcement'
import { useLang } from '../i18n/lang'
import { EASE } from '../lib/motion'
import { safeGetItem, safeSetItem, STORAGE_KEYS } from '../lib/storage'
import { ChevronDownIcon, CloseIcon, InfoIcon } from './icons'

function isDismissed(): boolean {
  return safeGetItem(STORAGE_KEYS.announcementDismissed) === ANNOUNCEMENT.id
}

/**
 * "Aviso del día" (cierres por clima, días festivos…), arriba de la barra de navegación.
 * Se controla desde src/config/announcement.ts. Al cerrarlo se guarda su id: un aviso
 * con id nuevo vuelve a aparecer.
 *
 * En el celular ocupa como máximo dos renglones; si el texto es más largo, se toca para leerlo
 * completo (y otra vez para contraerlo). En tableta y escritorio siempre se ve completo.
 */
export default function AnnouncementBanner({ onDismiss }: { onDismiss?: () => void }) {
  const { lang, t } = useLang()
  const [dismissed, setDismissed] = useState(isDismissed)
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const text = lang === 'en' && ANNOUNCEMENT.textEn?.trim() ? ANNOUNCEMENT.textEn : ANNOUNCEMENT.text
  const reduceMotion = useReducedMotion()
  const titleId = useId()

  const visible = ANNOUNCEMENT.active && ANNOUNCEMENT.text.trim() !== '' && !dismissed

  // ¿El texto no cabe en los dos renglones del celular? (sólo entonces se puede expandir)
  useEffect(() => {
    const el = textRef.current
    if (!visible || !el || typeof ResizeObserver !== 'function') return
    const check = () => {
      if (el.dataset.expanded === 'true') return
      const next = el.scrollHeight - el.clientHeight > 1
      setClamped((prev) => (prev === next ? prev : next))
    }
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible, text])

  const dismiss = () => {
    safeSetItem(STORAGE_KEYS.announcementDismissed, ANNOUNCEMENT.id)
    setDismissed(true)
    onDismiss?.()
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE }
  const canExpand = clamped || expanded

  return (
    <AnimatePresence initial>
      {visible ? (
        <motion.div
          key={ANNOUNCEMENT.id}
          role="region"
          aria-labelledby={titleId}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition}
          className="pointer-events-auto w-full overflow-hidden bg-deep text-foam"
        >
          <div className="relative">
            {/* Línea de atardecer decorativa en el borde inferior */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-gold via-sunset to-ocean opacity-80"
            />
            <div className="mx-auto flex max-w-5xl items-center gap-1 py-1 pr-0.5 pl-5 sm:gap-4 sm:py-1.5 sm:pr-1.5 sm:pl-6">
              <span
                aria-hidden="true"
                className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold sm:inline-flex"
              >
                <InfoIcon className="size-4" />
              </span>
              <div className="relative flex min-w-0 flex-1 items-center gap-2">
                <p
                  ref={textRef}
                  data-expanded={expanded}
                  className={`my-1 min-w-0 flex-1 text-[13px] leading-snug sm:my-0 sm:py-1 sm:text-sm ${expanded ? '' : 'max-sm:line-clamp-2'}`}
                >
                  <strong id={titleId} className="mr-2 font-semibold tracking-wide text-gold">
                    {t('Aviso del día', 'Notice of the day')}
                  </strong>
                  <span className="text-foam/90">{text}</span>
                </p>
                {canExpand ? (
                  <>
                    <ChevronDownIcon
                      className={`size-4 shrink-0 text-gold transition-transform duration-300 sm:hidden ${expanded ? 'rotate-180' : ''}`}
                    />
                    {/* Toda el área del texto es el botón (celular): más fácil de tocar que un ícono chico. */}
                    <button
                      type="button"
                      onClick={() => setExpanded((v) => !v)}
                      aria-expanded={expanded}
                      aria-label={expanded ? t('Contraer aviso', 'Collapse notice') : t('Leer aviso completo', 'Read full notice')}
                      className="absolute inset-0 rounded-lg focus-visible:outline-2 focus-visible:outline-gold sm:hidden"
                    />
                  </>
                ) : null}
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label={t('Cerrar aviso', 'Close notice')}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-foam/80 transition-colors duration-300 hover:bg-white/10 hover:text-foam sm:size-10"
              >
                <CloseIcon className="size-4.5" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
