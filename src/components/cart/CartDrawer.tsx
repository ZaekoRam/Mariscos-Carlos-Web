import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useRef, useState } from 'react'
import { copyText } from '../../lib/clipboard'
import { useMesaParam, parseMesa } from '../../lib/hooks'
import { linesCount, linesTotal, totalText, type OrderLine } from '../../lib/lines'
import { formatMXN } from '../../lib/menu'
import { buttonTap, EASE } from '../../lib/motion'
import { buildOrderMessage, openWhatsApp, type OrderMode } from '../../lib/whatsapp'
import { useLang } from '../../i18n/lang'
import { useMenuText } from '../../i18n/menuText'
import { useCart } from '../../store/cart'
import { CtaButton } from '../CtaButton'
import {
  ArrowRightIcon,
  BagIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  InfoIcon,
  TrashIcon,
  WhatsAppIcon,
} from '../icons'
import CartLineItem from './CartLineItem'
import OrderModePicker, { type ModeChoice } from './OrderModePicker'
import { useDialog } from './useDialog'

const FIELD =
  'w-full rounded-xl border border-deep/20 bg-white px-3 text-base text-deep placeholder:text-deep/70 transition-colors hover:border-deep/35'

/**
 * Panel lateral del pedido: líneas con cantidades, forma de entrega, nombre y notas,
 * vista previa del mensaje y envío por WhatsApp.
 */
export default function CartDrawer() {
  const { lines, isOpen, closeCart, increment, decrement, remove, clear, hasPerKilo } = useCart()
  const mesaParam = useMesaParam()
  const { t } = useLang()
  const { lineTitle } = useMenuText()
  const ESTIMATE_NOTE = t(
    'El total es estimado. Confirmamos precio y disponibilidad por WhatsApp.',
    'The total is an estimate. We confirm price and availability on WhatsApp.',
  )
  const PER_KILO_NOTE = t('Los productos por kilo se cobran según el peso.', 'Items sold by the kilo are charged by weight.')
  const SENT_NOTE = t(
    'Abrimos WhatsApp con tu pedido. Cuando lo envíes, te confirmamos por ahí.',
    'We opened WhatsApp with your order. Once you send it, we’ll confirm there.',
  )

  const [choice, setChoice] = useState<ModeChoice>(mesaParam ? 'mesa' : 'local')
  const [prevMesaParam, setPrevMesaParam] = useState(mesaParam)
  if (prevMesaParam !== mesaParam) {
    setPrevMesaParam(mesaParam)
    if (mesaParam) setChoice('mesa')
    else if (choice === 'mesa') setChoice('local')
  }
  const [mesaManual, setMesaManual] = useState('')
  const [mesaError, setMesaError] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  // Líneas que se enviaron: si el pedido cambia, la confirmación desaparece sola.
  const [sentLines, setSentLines] = useState<OrderLine[] | null>(null)
  const sent = sentLines !== null && sentLines === lines && lines.length > 0

  const reduceMotion = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const ids = useId()
  const titleId = `${ids}-title`
  const mesaSelectId = `${ids}-mesa`
  const previewId = `${ids}-preview`

  // A dónde regresa el foco al cerrar: al elemento que abrió el pedido si sigue en la
  // página; si no (el botón flotante desaparece con el pedido vacío, o se abrió desde
  // el menú móvil que ya se cerró), al botón flotante o al título del menú.
  const getReturnFocus = (previous: HTMLElement | null): HTMLElement | null => {
    const empty = lines.length === 0
    if (previous?.isConnected && !(empty && previous.closest('[data-cart-button]'))) return previous
    const cartButton = document.querySelector<HTMLElement>('[data-cart-button]')
    if (!empty && cartButton) return cartButton
    return document.getElementById('menu-title')
  }

  useDialog(isOpen, panelRef, titleRef, closeCart, getReturnFocus)

  const mesaNumber = mesaParam ?? parseMesa(mesaManual)
  const mode: OrderMode =
    choice === 'mesa' && mesaNumber
      ? { tipo: 'mesa', mesa: mesaNumber }
      : choice === 'llevar'
        ? { tipo: 'llevar' }
        : { tipo: 'local' }
  const message = buildOrderMessage({ lines, mode, notas, nombre })
  const count = linesCount(lines)
  const isEmpty = lines.length === 0

  const focusTitle = () => {
    window.requestAnimationFrame(() => titleRef.current?.focus({ preventScroll: true }))
  }

  const handleDecrement = (line: OrderLine) => {
    if (line.cantidad <= 1) {
      setAnnouncement(t(`Se quitó ${lineTitle(line)} del pedido`, `Removed ${lineTitle(line)} from your order`))
      focusTitle()
    }
    decrement(line.key)
  }

  const handleRemove = (line: OrderLine) => {
    setAnnouncement(t(`Se quitó ${lineTitle(line)} del pedido`, `Removed ${lineTitle(line)} from your order`))
    remove(line.key)
    focusTitle()
  }

  const handleChoice = (value: ModeChoice) => {
    setChoice(value)
    setMesaError(null)
  }

  const handleMesaManual = (value: string) => {
    setMesaManual(value)
    if (value) setMesaError(null)
  }

  const handleSend = () => {
    if (choice === 'mesa' && !mesaNumber) {
      setMesaError(t('Elige el número de tu mesa para enviar el pedido.', 'Choose your table number to send the order.'))
      window.requestAnimationFrame(() => document.getElementById(mesaSelectId)?.focus())
      return
    }
    openWhatsApp(message)
    setSentLines(lines)
    setAnnouncement(SENT_NOTE)
  }

  const handleClear = () => {
    clear()
    setSentLines(null)
    setPreviewOpen(false)
    setAnnouncement(t('Pedido vaciado', 'Order cleared'))
    focusTitle()
  }

  const handleCopy = async () => {
    const ok = await copyText(message)
    setCopied(ok)
    setAnnouncement(ok ? t('Mensaje copiado', 'Message copied') : t('No se pudo copiar el mensaje', 'Couldn’t copy the message'))
    if (ok) window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <div key="cart-drawer" className="fixed inset-0 z-[80]">
          <motion.div
            aria-hidden="true"
            onClick={closeCart}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute inset-0 bg-deep/50 backdrop-blur-[2px]"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: EASE }}
            className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-md flex-col bg-foam shadow-[-24px_0_60px_-30px_rgb(19_50_74/0.55)] outline-none md:rounded-l-[2rem]"
          >
            {/* Encabezado */}
            <div className="relative shrink-0 overflow-hidden border-b border-deep/10 bg-sand px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 md:rounded-tl-[2rem]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-gold/30 blur-2xl"
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-ocean-deep uppercase">{t('Pedido por WhatsApp', 'Order on WhatsApp')}</p>
                  <h2
                    ref={titleRef}
                    id={titleId}
                    tabIndex={-1}
                    className="mt-1 font-display text-[2rem] leading-none tracking-tight text-deep outline-none"
                  >
                    {t('Tu', 'Your')} <em className="font-normal text-sunset-deep italic">{t('pedido', 'order')}</em>
                  </h2>
                  <p className="mt-2 text-sm text-deep/75">
                    {isEmpty
                      ? t('Aún no agregas platillos.', 'You haven’t added any dishes yet.')
                      : count === 1
                        ? t('1 platillo', '1 dish')
                        : t(`${count} platillos`, `${count} dishes`)}
                    {mesaParam ? <span className="font-semibold text-deep"> · {t('Mesa', 'Table')} {mesaParam}</span> : null}
                  </p>
                </div>
                <motion.button
                  type="button"
                  whileTap={buttonTap}
                  onClick={closeCart}
                  aria-label={t('Cerrar pedido', 'Close order')}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full border border-deep/15 bg-white/80 text-deep transition-colors hover:bg-white"
                >
                  <CloseIcon className="size-5" />
                </motion.button>
              </div>
            </div>

            {/* Contenido con scroll propio */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {isEmpty ? (
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-sand text-ocean-deep">
                    <BagIcon className="size-7" />
                  </span>
                  <p className="mt-5 font-display text-2xl text-deep">{t('Tu pedido está vacío', 'Your order is empty')}</p>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-deep/75">
                    {t(
                      'Elige tus platillos en el menú, toca “Agregar” y aquí armamos tu mensaje para WhatsApp.',
                      'Pick your dishes from the menu, tap “Add” and we’ll put together your WhatsApp message here.',
                    )}
                  </p>
                  <CtaButton
                    href="#menu"
                    onClick={() => closeCart()}
                    variant="deep"
                    size="md"
                    className="mt-6"
                    iconRight={<ArrowRightIcon className="size-4.5" />}
                  >
                    {t('Ver menú', 'See menu')}
                  </CtaButton>
                </div>
              ) : (
                <div className="space-y-6">
                  <ul className="space-y-3" aria-label={t('Platillos del pedido', 'Dishes in your order')}>
                    <AnimatePresence initial={false}>
                      {lines.map((line) => (
                        <CartLineItem
                          key={line.key}
                          line={line}
                          onIncrement={(l) => increment(l.key)}
                          onDecrement={handleDecrement}
                          onRemove={handleRemove}
                        />
                      ))}
                    </AnimatePresence>
                  </ul>

                  <OrderModePicker
                    value={choice}
                    onChange={handleChoice}
                    mesaParam={mesaParam}
                    mesaManual={mesaManual}
                    onMesaManualChange={handleMesaManual}
                    mesaError={mesaError}
                    mesaSelectId={mesaSelectId}
                  />

                  <div>
                    <label htmlFor={`${ids}-nombre`} className="mb-1.5 block text-sm font-semibold text-deep">
                      {t('Nombre', 'Name')} <span className="font-normal text-deep/75">{t('(opcional)', '(optional)')}</span>
                    </label>
                    <input
                      id={`${ids}-nombre`}
                      type="text"
                      autoComplete="name"
                      maxLength={60}
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      aria-describedby={`${ids}-nombre-hint`}
                      placeholder={t('¿A nombre de quién?', 'Name for the order')}
                      className={`${FIELD} h-11`}
                    />
                    <p id={`${ids}-nombre-hint`} className="mt-1.5 text-[13px] text-deep/75 sm:text-xs">
                      {t('Útil si pasas a recoger tu pedido.', 'Helpful if you’re picking up your order.')}
                    </p>
                  </div>

                  <div>
                    <label htmlFor={`${ids}-notas`} className="mb-1.5 block text-sm font-semibold text-deep">
                      {t('Notas', 'Notes')} <span className="font-normal text-deep/75">{t('(opcional)', '(optional)')}</span>
                    </label>
                    <textarea
                      id={`${ids}-notas`}
                      rows={2}
                      maxLength={280}
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder={t('Ej. sin cebolla, salsa aparte', 'E.g. no onion, sauce on the side')}
                      className={`${FIELD} min-h-[4.5rem] resize-y py-2.5`}
                    />
                  </div>

                  {/* Vista previa del mensaje */}
                  <div className="rounded-2xl border border-deep/10 bg-white/60">
                    <button
                      type="button"
                      onClick={() => setPreviewOpen((v) => !v)}
                      aria-expanded={previewOpen}
                      aria-controls={previewId}
                      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold text-deep"
                    >
                      <span className="inline-flex items-center gap-2">
                        <WhatsAppIcon className="size-4.5 text-ocean-deep" />
                        {t('Ver mensaje', 'View message')}
                      </span>
                      <ChevronDownIcon
                        className={`size-4.5 transition-transform duration-300 ${previewOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {previewOpen ? (
                        <motion.div
                          id={previewId}
                          key="preview"
                          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={reduceMotion ? { duration: 0.15 } : { duration: 0.35, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4">
                            <div className="rounded-2xl rounded-tr-md bg-[#DCF8C6] p-3.5 shadow-[0_6px_14px_-10px_rgb(19_50_74/0.6)]">
                              <pre className="font-sans text-[13px] leading-relaxed break-words whitespace-pre-wrap text-ink">
                                {message}
                              </pre>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopy}
                              className="mt-2 inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-ocean-deep sm:h-10 transition-colors hover:bg-ocean/10"
                            >
                              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                              {copied ? t('Copiado', 'Copied') : t('Copiar mensaje', 'Copy message')}
                            </button>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Pie fijo: total y envío */}
            {!isEmpty ? (
              <div className="shrink-0 border-t border-deep/10 bg-white/85 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-deep">{t('Total estimado', 'Estimated total')}</span>
                  <span className="text-right font-display text-2xl leading-tight text-deep tabular-nums">
                    {t(totalText(lines), hasPerKilo ? `${formatMXN(linesTotal(lines))} + per-kg items` : formatMXN(linesTotal(lines)))}
                  </span>
                </div>
                <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-deep/75 sm:text-xs sm:leading-relaxed">
                  <InfoIcon className="mt-px size-3.5 shrink-0 text-ocean-deep" />
                  <span>
                    {ESTIMATE_NOTE}
                    {hasPerKilo ? ` ${PER_KILO_NOTE}` : ''}
                  </span>
                </p>

                <AnimatePresence mode="wait" initial={false}>
                  {sent ? (
                    <motion.div
                      key="sent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="mt-3 rounded-2xl border border-ocean-deep/20 bg-ocean/8 p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ocean-deep text-white">
                          <CheckIcon className="size-4.5" />
                        </span>
                        <p className="text-sm leading-snug font-medium text-deep">{SENT_NOTE}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <CtaButton variant="deep" size="sm" onClick={handleClear} icon={<TrashIcon className="size-4" />}>
                          {t('Vaciar pedido', 'Clear order')}
                        </CtaButton>
                        <CtaButton
                          variant="outline"
                          size="sm"
                          onClick={() => openWhatsApp(message)}
                          icon={<WhatsAppIcon className="size-4" />}
                        >
                          {t('Abrir otra vez', 'Open again')}
                        </CtaButton>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="send"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="mt-3"
                    >
                      <CtaButton
                        variant="sunset"
                        size="lg"
                        onClick={handleSend}
                        className="w-full"
                        icon={<WhatsAppIcon className="size-5" />}
                      >
                        {t('Enviar pedido por WhatsApp', 'Send order on WhatsApp')}
                      </CtaButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {announcement}
            </p>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
