import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import logo from '../assets/logo.svg'
import { CtaButton } from '../components/CtaButton'
import { controlClass, describedBy, FieldError, FieldHint, FieldLabel } from '../components/forms/fields'
import { CheckIcon, ChevronDownIcon, CopyIcon, InfoIcon, WhatsAppIcon } from '../components/icons'
import { Reveal, Section, SectionHeading } from '../components/Section'
import { getPaymentValue, isPaymentConfirmed, PAYMENT_PENDING_LABEL } from '../config/payment'
import type { PaymentField } from '../config/payment'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { useMesaParam } from '../lib/hooks'
import { buttonTap, EASE } from '../lib/motion'
import { copyText } from '../lib/clipboard'
import { buildPaymentMessage, openWhatsApp, paymentConcept } from '../lib/whatsapp'

type CopyKey = PaymentField | 'concepto'

const FIELDS: { field: PaymentField; label: string; labelEn: string }[] = [
  { field: 'banco', label: 'Banco', labelEn: 'Bank' },
  { field: 'clabe', label: 'CLABE', labelEn: 'CLABE' },
  { field: 'titular', label: 'Titular', labelEn: 'Account holder' },
]

/** Etiqueta en inglés de PAYMENT_PENDING_LABEL. */
const PAYMENT_PENDING_LABEL_EN = 'Pending confirmation'

const MESAS = Array.from({ length: SITE.totalMesas }, (_, i) => i + 1)
const NOMBRE_MAX = 40
const COPIED_MS = 2200

/** "012345678901234567" → "012 345 678 901 234 567" (sólo para mostrar). */
function groupClabe(value: string): string {
  const digits = value.replace(/\s+/g, '')
  const size = digits.length % 3 === 0 ? 3 : 4
  return digits.match(new RegExp(`.{1,${size}}`, 'g'))?.join(' ') ?? digits
}

/** Texto que se copia: la CLABE sin espacios; los demás campos tal cual. */
function copyValue(field: PaymentField, value: string): string {
  return field === 'clabe' ? value.replace(/\s+/g, '') : value.trim()
}

/** Deja sólo dígitos y un punto decimal (máx. 2 decimales). */
function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const [int = '', ...rest] = cleaned.split('.')
  const intPart = int.slice(0, 7)
  if (rest.length === 0) return intPart
  return `${intPart}.${rest.join('').slice(0, 2)}`
}

export default function Payment() {
  const { lang, t } = useLang()
  const en = lang === 'en'
  const uid = useId()
  const ids = {
    mesa: `${uid}-mesa`,
    nombre: `${uid}-nombre`,
    monto: `${uid}-monto`,
    pending: `${uid}-pendiente`,
    concepto: `${uid}-concepto`,
  }

  const confirmed = isPaymentConfirmed()
  const mesaParam = useMesaParam()

  const [mesa, setMesa] = useState(mesaParam ? String(mesaParam) : '')
  const [mesaSource, setMesaSource] = useState(mesaParam)
  // Si cambia ?mesa=N (por ejemplo, otro QR), se actualiza el selector.
  if (mesaParam !== mesaSource) {
    setMesaSource(mesaParam)
    if (mesaParam) setMesa(String(mesaParam))
  }

  const [nombre, setNombre] = useState('')
  const [monto, setMonto] = useState('')
  const [errors, setErrors] = useState<{ mesa?: string; nombre?: string }>({})
  const [attempted, setAttempted] = useState(false)
  const [copied, setCopied] = useState<CopyKey | null>(null)
  const [announce, setAnnounce] = useState('')

  const mesaRef = useRef<HTMLSelectElement>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const mesaNumber = mesa ? Number(mesa) : null
  const concepto = paymentConcept(mesaNumber, nombre)
  const conceptoReady = mesaNumber !== null && nombre.trim().length > 0

  function validate(nextMesa: string, nextNombre: string) {
    return {
      mesa: nextMesa ? undefined : t('Elige tu número de mesa.', 'Choose your table number.'),
      nombre: nextNombre.trim() ? undefined : t('Escribe tu nombre para el concepto.', 'Enter your name for the reference.'),
    }
  }

  async function handleCopy(key: CopyKey, label: string, text: string) {
    const ok = await copyText(text)
    window.clearTimeout(timer.current)
    if (ok) {
      setCopied(key)
      setAnnounce(t(`Copiado: ${label}`, `Copied: ${label}`))
      timer.current = window.setTimeout(() => {
        setCopied(null)
        setAnnounce('')
      }, COPIED_MS)
    } else {
      setCopied(null)
      setAnnounce(
        t(
          `No se pudo copiar ${label.toLowerCase()}. Selecciónalo y cópialo a mano.`,
          `Couldn’t copy the ${label.toLowerCase()}. Select it and copy it manually.`,
        ),
      )
    }
  }

  function handlePaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)
    const found = validate(mesa, nombre)
    setErrors(found)
    if (found.mesa) {
      mesaRef.current?.focus()
      return
    }
    if (found.nombre) {
      nombreRef.current?.focus()
      return
    }
    const amount = monto.trim() ? `$${monto.trim()}` : undefined
    openWhatsApp(buildPaymentMessage(concepto, amount))
    setAnnounce(
      t(
        'Abrimos WhatsApp con tu aviso de pago. Adjunta tu comprobante en el chat.',
        'We opened WhatsApp with your payment notice. Attach your receipt in the chat.',
      ),
    )
  }

  return (
    <Section
      id="pago"
      labelledBy="pago-title"
      className="overflow-hidden bg-deep text-foam max-sm:px-5 max-sm:pt-20 max-md:pb-[calc(5rem+env(safe-area-inset-bottom))]"
    >
      {/* Resplandor decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-40 size-[28rem] rounded-full bg-[radial-gradient(circle,rgb(28_124_156/0.35),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-0 size-[24rem] rounded-full bg-[radial-gradient(circle,rgb(232_85_43/0.14),transparent_65%)]"
      />

      <SectionHeading
        id="pago-title"
        tone="dark"
        eyebrow={t('Pago por transferencia', 'Pay by bank transfer')}
        title={
          en ? (
            <>
              Payment <em className="text-gold italic">details</em>
            </>
          ) : (
            <>
              Ficha de <em className="text-gold italic">pago</em>
            </>
          )
        }
        description={t(
          'Paga tu cuenta por transferencia con el concepto de tu mesa y avísanos por WhatsApp con tu comprobante.',
          'Pay your bill by bank transfer using your table’s reference, then let us know on WhatsApp with your receipt.',
        )}
      />

      {!confirmed ? (
        <Reveal className="relative mb-8 md:mb-10">
          <div
            id={ids.pending}
            role="note"
            className="flex gap-3 rounded-2xl border border-dashed border-gold/60 bg-gold/10 p-4 text-foam sm:items-center sm:gap-4 sm:p-5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold text-deep">
              <InfoIcon className="size-5" />
            </span>
            <p className="text-sm leading-relaxed text-pretty sm:text-[15px]">
              <strong className="font-semibold text-gold">{t('Datos pendientes:', 'Details pending:')}</strong>{' '}
              {t(
                'el restaurante aún no confirma la cuenta para transferencias. No realices pagos hasta que aquí aparezcan los datos confirmados.',
                'the restaurant hasn’t confirmed the account for transfers yet. Don’t make any payments until the confirmed details appear here.',
              )}
            </p>
          </div>
        </Reveal>
      ) : null}

      <div className="relative grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        {/* Ficha */}
        <Reveal className="min-w-0 lg:col-span-7">
          <motion.article
            aria-labelledby={`${uid}-ficha-title`}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="relative isolate overflow-hidden rounded-[2rem] bg-linear-to-br from-ocean-deep via-[#174a67] to-deep text-foam shadow-[0_34px_70px_-34px_rgb(0_0_0/0.75)] ring-1 ring-white/15 transition-shadow hover:shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)]"
          >
            <WavePattern />

            <div className="relative p-5 sm:p-8">
              {/* Encabezado de la tarjeta */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <GoldChip />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-foam/90 uppercase">{t('Transferencia', 'Bank transfer')}</p>
                    <h3 id={`${uid}-ficha-title`} className="truncate font-display text-xl leading-tight text-foam sm:text-2xl">
                      {SITE.nombre}
                    </h3>
                  </div>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-foam shadow-md ring-2 ring-white/30">
                  <img src={logo} alt="" className="size-7" width={28} height={28} />
                </span>
              </div>

              {!confirmed ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-deep">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-deep" />
                  {t('Datos sin confirmar', 'Unconfirmed details')}
                </p>
              ) : null}

              <dl className="mt-6 flex flex-col gap-5 sm:mt-8">
                {FIELDS.map(({ field, label: labelEs, labelEn }) => {
                  const label = en ? labelEn : labelEs
                  const value = getPaymentValue(field)
                  const big = field === 'clabe'
                  return (
                    <div
                      key={field}
                      className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-white/10 pb-5 last:border-b-0 last:pb-0 max-sm:flex-nowrap max-sm:items-center"
                    >
                      <div className="min-w-0 flex-1 basis-48">
                        <dt className="text-[11px] font-semibold tracking-[0.18em] text-foam/90 uppercase">{label}</dt>
                        <dd className="mt-1.5">
                          {value ? (
                            <span
                              className={
                                big
                                  ? 'block font-display text-[26px] leading-tight tracking-[0.04em] text-foam tabular-nums sm:text-3xl'
                                  : 'block text-lg font-semibold text-foam break-words'
                              }
                            >
                              {big ? groupClabe(value) : value}
                            </span>
                          ) : (
                            <PendingValue big={big} label={en ? PAYMENT_PENDING_LABEL_EN : PAYMENT_PENDING_LABEL} />
                          )}
                        </dd>
                      </div>
                      <CopyButton
                        label={label}
                        copied={copied === field}
                        disabled={!value}
                        describedById={!value && !confirmed ? ids.pending : undefined}
                        onCopy={() => {
                          if (value) void handleCopy(field, label, copyValue(field, value))
                        }}
                      />
                    </div>
                  )
                })}
              </dl>
            </div>

            {/* Talón con el concepto (perforación de boleto) */}
            <div className="relative border-t-2 border-dashed border-white/25 bg-black/10 p-5 sm:px-8 sm:py-6">
              <span aria-hidden="true" className="absolute -top-3.5 -left-3.5 size-7 rounded-full bg-deep" />
              <span aria-hidden="true" className="absolute -top-3.5 -right-3.5 size-7 rounded-full bg-deep" />
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 max-sm:flex-nowrap max-sm:items-center">
                <div className="min-w-0 flex-1 basis-48">
                  <p id={ids.concepto} className="text-[11px] font-semibold tracking-[0.18em] text-foam/90 uppercase">
                    {t('Concepto', 'Reference')}
                  </p>
                  <p
                    className={`mt-1.5 font-display text-2xl leading-tight break-words sm:text-[28px] ${
                      conceptoReady ? 'text-foam' : 'text-foam/90 italic'
                    }`}
                  >
                    {en && !conceptoReady ? concepto.replace('[nombre]', '[name]') : concepto}
                  </p>
                  {!conceptoReady ? (
                    <p className="mt-1.5 text-xs text-foam/90 max-sm:text-[13px] max-sm:leading-snug max-sm:text-pretty">
                      {t('Completa tu mesa y tu nombre para copiarlo.', 'Fill in your table and name to copy it.')}
                    </p>
                  ) : null}
                </div>
                <CopyButton
                  label={t('Concepto', 'Reference')}
                  copied={copied === 'concepto'}
                  disabled={!conceptoReady}
                  onCopy={() => {
                    if (conceptoReady) void handleCopy('concepto', t('Concepto', 'Reference'), concepto)
                  }}
                />
              </div>
            </div>
          </motion.article>

          <p className="mt-4 text-sm leading-relaxed text-foam/80">
            {confirmed
              ? t(
                  'Antes de transferir, verifica que el titular coincida con el de esta ficha.',
                  'Before transferring, check that the account holder matches the one shown here.',
                )
              : t(
                  `Los campos marcados como “${PAYMENT_PENDING_LABEL}” no se pueden copiar todavía.`,
                  `Fields marked “${PAYMENT_PENDING_LABEL_EN}” can’t be copied yet.`,
                )}
          </p>
        </Reveal>

        {/* Formulario de concepto + "Ya pagué" */}
        <Reveal delay={0.1} className="min-w-0 lg:col-span-5">
          <form
            noValidate
            onSubmit={handlePaid}
            aria-labelledby={`${uid}-form-title`}
            className="rounded-3xl border border-white/10 bg-foam p-5 text-deep shadow-[0_24px_50px_-28px_rgb(0_0_0/0.6)] sm:p-7"
          >
            <h3 id={`${uid}-form-title`} className="text-2xl leading-tight text-deep">
              {t('Arma tu', 'Build your')} <em className="text-ocean-deep italic">{t('concepto', 'reference')}</em>
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-deep/75">
              {t(
                'Escríbelo tal cual en tu transferencia para que identifiquemos tu pago.',
                'Enter it exactly as shown in your transfer so we can identify your payment.',
              )}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-5 lg:grid-cols-1 xl:grid-cols-5">
              <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <FieldLabel htmlFor={ids.mesa}>{t('Mesa', 'Table')}</FieldLabel>
                <div className="relative">
                  <select
                    ref={mesaRef}
                    id={ids.mesa}
                    name="mesa"
                    required
                    aria-required="true"
                    aria-invalid={errors.mesa ? true : undefined}
                    aria-describedby={describedBy(errors.mesa ? `${ids.mesa}-error` : mesaParam !== null && `${ids.mesa}-hint`)}
                    value={mesa}
                    onChange={(e) => {
                      setMesa(e.target.value)
                      if (attempted || errors.mesa) setErrors((prev) => ({ ...prev, mesa: validate(e.target.value, nombre).mesa }))
                    }}
                    className={controlClass(Boolean(errors.mesa), 'appearance-none pr-11')}
                  >
                    <option value="">{t('Elige', 'Choose')}</option>
                    {MESAS.map((n) => (
                      <option key={n} value={String(n)}>
                        {t('Mesa', 'Table')} {n}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-deep/70" />
                </div>
                {errors.mesa ? (
                  <FieldError id={`${ids.mesa}-error`} message={errors.mesa} />
                ) : mesaParam ? (
                  <FieldHint id={`${ids.mesa}-hint`}>{t('Tomada del código QR de tu mesa.', 'Taken from your table’s QR code.')}</FieldHint>
                ) : null}
              </div>

              <div className="sm:col-span-3 lg:col-span-1 xl:col-span-3">
                <FieldLabel htmlFor={ids.nombre}>{t('Nombre', 'Name')}</FieldLabel>
                <input
                  ref={nombreRef}
                  id={ids.nombre}
                  name="nombre"
                  type="text"
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={NOMBRE_MAX}
                  required
                  aria-required="true"
                  aria-invalid={errors.nombre ? true : undefined}
                  aria-describedby={describedBy(errors.nombre && `${ids.nombre}-error`)}
                  value={nombre}
                  placeholder={t('Tu nombre', 'Your name')}
                  onChange={(e) => {
                    setNombre(e.target.value)
                    if (attempted || errors.nombre) {
                      setErrors((prev) => ({ ...prev, nombre: validate(mesa, e.target.value).nombre }))
                    }
                  }}
                  className={controlClass(Boolean(errors.nombre))}
                />
                <FieldError id={`${ids.nombre}-error`} message={errors.nombre} />
              </div>

              <div className="sm:col-span-5 lg:col-span-1 xl:col-span-5">
                <FieldLabel htmlFor={ids.monto} optional>
                  {t('Monto', 'Amount')}
                </FieldLabel>
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-display text-lg text-deep/70"
                  >
                    $
                  </span>
                  <input
                    id={ids.monto}
                    name="monto"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-describedby={`${ids.monto}-hint`}
                    value={monto}
                    placeholder="0.00"
                    onChange={(e) => setMonto(sanitizeAmount(e.target.value))}
                    className={controlClass(false, 'pl-9 tabular-nums')}
                  />
                </div>
                <FieldHint id={`${ids.monto}-hint`}>
                  {t('En pesos. Se incluye en tu mensaje de WhatsApp.', 'In Mexican pesos. It’s included in your WhatsApp message.')}
                </FieldHint>
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-3">
              <CtaButton type="submit" size="lg" icon={<WhatsAppIcon className="size-5" />} className="w-full">
                {t('Ya pagué', 'I’ve paid')}
              </CtaButton>
              <p className="text-center text-xs leading-relaxed text-deep/70 max-sm:text-[13px] max-sm:text-balance">
                {t(
                  'Se abre WhatsApp con tu concepto; adjunta ahí tu comprobante.',
                  'WhatsApp opens with your reference; attach your receipt there.',
                )}
              </p>
            </div>
          </form>
        </Reveal>
      </div>

      {/* Avisos de "Copiado" y del botón "Ya pagué" */}
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </Section>
  )
}

function PendingValue({ big, label }: { big: boolean; label: string }) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${big ? 'mt-0.5' : ''}`}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gold/70 bg-white/5 px-3 py-1 text-sm text-foam italic">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
        {label}
      </span>
      {big ? (
        <span aria-hidden="true" className="font-display text-xl tracking-[0.2em] text-foam/40 select-none">
          ··· ··· ···
        </span>
      ) : null}
    </span>
  )
}

function CopyButton({
  label,
  copied,
  disabled,
  describedById,
  onCopy,
}: {
  label: string
  copied: boolean
  disabled: boolean
  describedById?: string
  onCopy: () => void
}) {
  const { t } = useLang()
  return (
    <motion.button
      type="button"
      onClick={onCopy}
      disabled={disabled}
      whileTap={disabled ? undefined : buttonTap}
      aria-label={
        disabled
          ? t(`Copiar ${label.toLowerCase()} (no disponible)`, `Copy ${label.toLowerCase()} (not available)`)
          : t(`Copiar ${label.toLowerCase()}`, `Copy ${label.toLowerCase()}`)
      }
      aria-describedby={describedById}
      title={disabled ? t('No disponible todavía', 'Not available yet') : undefined}
      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 max-sm:size-11 max-sm:justify-center max-sm:px-0 ${
        disabled
          ? 'cursor-not-allowed border-dashed border-white/25 text-foam/50'
          : copied
            ? 'border-gold bg-gold text-deep'
            : 'border-white/30 bg-white/10 text-foam hover:bg-white/20'
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'ok' : 'copy'}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18, ease: EASE }}
          className="flex"
        >
          {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </motion.span>
      </AnimatePresence>
      {/* En celular queda sólo el ícono (el nombre accesible ya viene en aria-label). */}
      <span className="max-sm:hidden">{copied ? t('Copiado', 'Copied') : t('Copiar', 'Copy')}</span>
    </motion.button>
  )
}

/** Chip dorado de tarjeta bancaria (decorativo). */
function GoldChip() {
  return (
    <span
      aria-hidden="true"
      className="relative block h-9 w-12 shrink-0 overflow-hidden rounded-lg bg-linear-to-br from-[#f8d98a] via-gold to-[#c48a1c] shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_2px_6px_rgb(0_0_0/0.25)]"
    >
      <span className="absolute inset-x-0 top-1/2 h-px bg-deep/25" />
      <span className="absolute inset-y-0 left-1/3 w-px bg-deep/25" />
      <span className="absolute inset-y-0 left-2/3 w-px bg-deep/25" />
      <span className="absolute top-1/2 left-1/2 h-5 w-4 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-deep/25" />
    </span>
  )
}

/** Patrón sutil de olas sobre la tarjeta (decorativo, estático). */
function WavePattern() {
  const rows = [40, 70, 100, 130, 160, 190, 220]
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 480 260"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
    >
      <defs>
        <radialGradient id="ficha-glow" cx="85%" cy="0%" r="70%">
          <stop offset="0%" stopColor="#F2B134" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#F2B134" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="480" height="260" fill="url(#ficha-glow)" />
      {rows.map((y, i) => (
        <path
          key={y}
          d={`M0 ${y} Q 30 ${y - 10} 60 ${y} T 120 ${y} T 180 ${y} T 240 ${y} T 300 ${y} T 360 ${y} T 420 ${y} T 480 ${y}`}
          fill="none"
          stroke="#FBF6EC"
          strokeOpacity={0.05 + (i % 3) * 0.02}
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
