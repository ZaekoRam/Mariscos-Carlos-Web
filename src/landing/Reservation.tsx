import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useMemo, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { CalendarIcon, CheckIcon, ClockIcon, InfoIcon, MinusIcon, PlusIcon, UsersIcon, WhatsAppIcon } from '../components/icons'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { CLOSED_WEEKDAY, getZonedNow, RESERVATION_SLOTS, todayIsoInRestaurantZone, weekdayOfIsoDate } from '../lib/hours'
import { EASE } from '../lib/motion'
import { buildReservationMessage, openWhatsApp } from '../lib/whatsapp'
import { REAL } from './media'
import { Eyebrow, ParallaxImg, RevealTitle } from './primitives'

const MIN = 1
const MAX = 20
const DAYS_AHEAD = 21

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function dateLabel(iso: string, lang: 'es' | 'en', opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-MX', { timeZone: 'UTC', ...opts }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

/* ------------------------------------------------------------------------------------------ */
/* Mediodía / tarde                                                                             */
/* ------------------------------------------------------------------------------------------ */

type DayPart = 'mediodia' | 'tarde'

/** La tarde empieza a las 16:00 (el restaurante cierra a las 19:00). */
const AFTERNOON_FROM = 16 * 60

const partOf = (slot: string): DayPart => (minutesOf(slot) < AFTERNOON_FROM ? 'mediodia' : 'tarde')

const PART_SLOTS: Record<DayPart, string[]> = {
  mediodia: RESERVATION_SLOTS.filter((s) => partOf(s) === 'mediodia'),
  tarde: RESERVATION_SLOTS.filter((s) => partOf(s) === 'tarde'),
}

const rangeOf = (part: DayPart) => `${PART_SLOTS[part][0]}–${PART_SLOTS[part][PART_SLOTS[part].length - 1]}`

const otherPart = (part: DayPart): DayPart => (part === 'mediodia' ? 'tarde' : 'mediodia')

/** Rebote suave del sol al cambiar (como el interruptor original). */
const SWITCH_EASE = 'ease-[cubic-bezier(0.34,1.32,0.5,1)]'

const SKY_DAY: CSSProperties = {
  background: 'linear-gradient(180deg, #5DB6D4 0%, #2F93B7 48%, #1C7C9C 100%)',
}

const SKY_DUSK: CSSProperties = {
  background:
    'radial-gradient(85% 80% at 78% 88%, rgb(242 177 52 / 0.95) 0%, rgb(232 85 43 / 0.75) 32%, rgb(196 68 30 / 0) 66%), linear-gradient(180deg, #0A1B28 0%, #13324A 38%, #7A3428 70%, #E8552B 100%)',
}

const HALO_DAY: CSSProperties = {
  boxShadow:
    'inset 0 0 0 3.375em rgb(255 255 255 / 0.13), 0 0 0 0.625em rgb(255 255 255 / 0.13), 0 0 0 1.25em rgb(255 255 255 / 0.09)',
}

const HALO_DUSK: CSSProperties = {
  boxShadow:
    'inset 0 0 0 3.375em rgb(242 177 52 / 0.14), 0 0 0 0.625em rgb(242 177 52 / 0.12), 0 0 0 1.25em rgb(232 85 43 / 0.1)',
}

const SUN_DAY: CSSProperties = {
  background: 'radial-gradient(circle at 34% 30%, #FFE7A8 0%, #F2B134 52%, #D9952A 100%)',
  boxShadow: 'inset 0.06em 0.06em 0.06em rgb(255 252 235 / 0.7), inset 0 -0.08em 0.08em #A87A1F, 0.05em 0.12em 0.2em rgb(10 27 40 / 0.3)',
}

const SUN_DUSK: CSSProperties = {
  background: 'radial-gradient(circle at 42% 28%, #FFD27A 0%, #F59A45 40%, #E8552B 78%, #C4441E 100%)',
  boxShadow: 'inset 0.06em 0.06em 0.06em rgb(255 236 200 / 0.6), inset 0 -0.08em 0.08em #A9391A, 0 0 0.6em rgb(242 177 52 / 0.55)',
}

/** Nubes del mediodía: centro x, base y diámetro en em (abajo a la derecha, como el original). */
const CLOUDS_BACK = [
  { x: 2.55, b: -0.5, s: 1.15 },
  { x: 3.4, b: -0.25, s: 1.2 },
  { x: 4.25, b: 0.12, s: 1.35 },
  { x: 5.1, b: 0.52, s: 1.5 },
]
const CLOUDS_FRONT = [
  { x: 1.8, b: -0.82, s: 1.2 },
  { x: 2.65, b: -0.74, s: 1.25 },
  { x: 3.5, b: -0.58, s: 1.25 },
  { x: 4.3, b: -0.36, s: 1.3 },
  { x: 5.05, b: -0.02, s: 1.35 },
  { x: 5.7, b: 0.4, s: 1.2 },
]

/** Estrellas de la tarde (arriba a la izquierda, donde el cielo ya es azul noche). */
const STARS = [
  { x: 0.55, y: 0.42, s: 0.34 },
  { x: 1.2, y: 0.86, s: 0.24 },
  { x: 1.72, y: 0.3, s: 0.28 },
  { x: 2.4, y: 0.68, s: 0.2 },
  { x: 2.95, y: 0.28, s: 0.24 },
  { x: 0.95, y: 1.3, s: 0.16 },
]

function Sparkle({ style }: { style: CSSProperties }) {
  return (
    <svg viewBox="0 0 10 10" className="absolute" style={style}>
      <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="#FBF6EC" />
    </svg>
  )
}

/**
 * Interruptor mediodía ↔ tarde (inspirado en el switch sol/luna de Uiverse, con la paleta de la casa):
 * de día, cielo azul con nubes y sol dorado; de tarde, atardecer con el sol bajando al mar y estrellas.
 * Es un role="switch" real (activado = tarde). Sólo se animan transform y opacity.
 */
function DayPartSwitch({ value, onChange }: { value: DayPart; onChange: (part: DayPart) => void }) {
  const { t } = useLang()
  const dusk = value === 'tarde'

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      onChange(event.key === 'ArrowLeft' ? 'mediodia' : 'tarde')
    }
  }

  const side = (part: DayPart, name: string, align: 'start' | 'end') => {
    const active = value === part
    return (
      <span
        onClick={() => onChange(part)}
        className={`min-w-0 cursor-pointer select-none transition-opacity duration-300 ${align === 'end' ? 'text-right' : 'text-left'} ${active ? 'opacity-100' : 'opacity-75 hover:opacity-100'}`}
      >
        <span className="relative inline-block pb-1.5 font-banner text-[13px] leading-none font-semibold tracking-[0.06em] text-deep uppercase sm:text-lg sm:tracking-[0.12em]">
          {name}
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-sunset-deep transition-transform duration-500 ${SWITCH_EASE} ${align === 'end' ? 'origin-right' : 'origin-left'} ${active ? 'scale-x-100' : 'scale-x-0'}`}
          />
        </span>
        <span className="mt-1 block text-[11px] font-medium whitespace-nowrap text-deep/80 tabular-nums sm:text-xs">{rangeOf(part)}</span>
      </span>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2.5 sm:gap-5">
      {side('mediodia', t('Mediodía', 'Midday'), 'end')}
      <button
        type="button"
        role="switch"
        aria-checked={dusk}
        aria-label={t(`Horarios de la tarde, ${rangeOf('tarde')}`, `Afternoon times, ${rangeOf('tarde')}`)}
        onClick={() => onChange(otherPart(value))}
        onKeyDown={onKeyDown}
        className="group relative isolate h-[2.5em] w-[5.625em] shrink-0 overflow-hidden rounded-full text-[18px] shadow-[0_0.45em_0.9em_-0.5em_rgb(19_50_74/0.75),0_0_0_1px_rgb(19_50_74/0.1)] sm:text-[23px]"
      >
        {/* Cielos: el de la tarde aparece encima del de mediodía */}
        <span aria-hidden="true" className="absolute inset-0" style={SKY_DAY} />
        <span aria-hidden="true" className={`absolute inset-0 transition-opacity duration-500 ${dusk ? 'opacity-100' : 'opacity-0'}`} style={SKY_DUSK} />

        {/* Estrellas */}
        {STARS.map((star, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`absolute inset-0 transition-[transform,opacity] duration-500 ${SWITCH_EASE} ${dusk ? 'translate-y-0 opacity-100' : '-translate-y-[0.6em] opacity-0'}`}
            style={{ transitionDelay: dusk ? `${120 + i * 60}ms` : '0ms' }}
          >
            <Sparkle style={{ left: `${star.x - star.s / 2}em`, top: `${star.y - star.s / 2}em`, width: `${star.s}em`, height: `${star.s}em` }} />
          </span>
        ))}

        {/* Sol con halos: a la izquierda al mediodía, abajo a la derecha (hundiéndose) en la tarde */}
        <span
          aria-hidden="true"
          className={`absolute -top-[0.4375em] -left-[0.4375em] size-[3.375em] transition-transform duration-[650ms] ${SWITCH_EASE}`}
          style={{ transform: dusk ? 'translate(3.125em, 0.64em)' : 'translate(0, 0)' }}
        >
          <span className={`absolute inset-0 rounded-full transition-opacity duration-500 ${dusk ? 'opacity-0' : 'opacity-100'}`} style={HALO_DAY} />
          <span className={`absolute inset-0 rounded-full transition-opacity duration-500 ${dusk ? 'opacity-100' : 'opacity-0'}`} style={HALO_DUSK} />
          <span
            className={`absolute inset-0 grid place-items-center transition-transform duration-300 ease-out ${dusk ? 'group-hover:-translate-x-[0.1em]' : 'group-hover:translate-x-[0.12em]'}`}
          >
            <span className={`relative size-[2.125em] transition-transform duration-500 ${dusk ? 'scale-110' : 'scale-100'}`}>
              <span className="absolute inset-0 rounded-full" style={SUN_DAY} />
              <span className={`absolute inset-0 rounded-full transition-opacity duration-500 ${dusk ? 'opacity-100' : 'opacity-0'}`} style={SUN_DUSK} />
            </span>
          </span>
        </span>

        {/* Nubes del mediodía */}
        <span
          aria-hidden="true"
          className={`absolute inset-0 transition-[transform,opacity] duration-500 ${SWITCH_EASE} ${dusk ? 'translate-y-[1.6em] opacity-0' : 'translate-y-0 opacity-100'}`}
        >
          {CLOUDS_BACK.map((c, i) => (
            <span
              key={`b${i}`}
              className="absolute rounded-full bg-[#A9D5E6]"
              style={{ left: `${c.x - c.s / 2}em`, bottom: `${c.b}em`, width: `${c.s}em`, height: `${c.s}em` }}
            />
          ))}
          {CLOUDS_FRONT.map((c, i) => (
            <span
              key={`f${i}`}
              className="absolute rounded-full bg-foam"
              style={{ left: `${c.x - c.s / 2}em`, bottom: `${c.b}em`, width: `${c.s}em`, height: `${c.s}em` }}
            />
          ))}
        </span>

        {/* Mar de la tarde, con reflejos dorados bajo el sol */}
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-[0.62em] transition-[transform,opacity] duration-500 ${SWITCH_EASE} ${dusk ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
          style={{ background: 'linear-gradient(180deg, #16405C 0%, #0F2A3D 55%, #0A1B28 100%)', boxShadow: 'inset 0 1px 0 rgb(242 177 52 / 0.65)' }}
        >
          <span className="absolute top-[0.14em] left-[3.75em] h-[0.07em] w-[1.25em] rounded-full bg-gold/80" />
          <span className="absolute top-[0.3em] left-[4.02em] h-[0.06em] w-[0.72em] rounded-full bg-gold/60" />
          <span className="absolute top-[0.45em] left-[4.22em] h-[0.05em] w-[0.34em] rounded-full bg-gold/45" />
        </span>

        {/* Sombra interior (profundidad del riel) */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0.06em_0.2em_rgb(0_0_0/0.35)]" />
      </button>
      {side('tarde', t('Tarde', 'Afternoon'), 'start')}
    </div>
  )
}

/**
 * Reservaciones: personas, día (los martes aparecen cerrados) y hora en botones, con un resumen
 * claro y el envío por WhatsApp. El mensaje al restaurante va en español.
 */
export default function Reservation() {
  const { t, lang } = useLang()
  const uid = useId()
  const today = todayIsoInRestaurantZone()
  const now = getZonedNow()
  const [personas, setPersonas] = useState(2)
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [nombre, setNombre] = useState('')
  const [comentario, setComentario] = useState('')
  const [showOther, setShowOther] = useState(false)
  const [errors, setErrors] = useState<{ nombre?: string; fecha?: string; hora?: string }>({})
  const [sent, setSent] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const reduce = useReducedMotion() ?? false

  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)), [today])
  const slotPassed = (iso: string, slot: string) => iso === today && minutesOf(slot) <= now.minutes
  const dayClosed = (iso: string) => weekdayOfIsoDate(iso) === CLOSED_WEEKDAY
  const dayFull = (iso: string) => RESERVATION_SLOTS.every((s) => slotPassed(iso, s))
  const partOpen = (iso: string, p: DayPart) => PART_SLOTS[p].some((s) => !slotPassed(iso, s))

  // Por defecto, la parte del día donde está el siguiente horario disponible hoy.
  const [part, setPart] = useState<DayPart>(() => {
    if (dayClosed(today)) return 'mediodia'
    const next = RESERVATION_SLOTS.find((s) => !slotPassed(today, s))
    return next ? partOf(next) : 'mediodia'
  })

  const choosePart = (p: DayPart) => {
    setPart(p)
    if (hora && partOf(hora) !== p) {
      setHora('')
      setSent(false)
    }
  }

  /** Si en ese día ya pasaron todos los horarios de la parte elegida, cambia a la otra. */
  const fitPartTo = (iso: string) => {
    if (iso && !partOpen(iso, part) && partOpen(iso, otherPart(part))) choosePart(otherPart(part))
  }

  const pickDate = (iso: string) => {
    setFecha(iso)
    setSent(false)
    if (hora && slotPassed(iso, hora)) setHora('')
    setErrors((e) => ({ ...e, fecha: undefined }))
    fitPartTo(iso)
  }

  const validateOtherDate = (iso: string) => {
    if (!iso) return t('Elige la fecha de tu visita.', 'Choose the date of your visit.')
    if (iso < today) return t('Esa fecha ya pasó. Elige hoy o un día posterior.', 'That date has passed. Pick today or later.')
    if (dayClosed(iso)) return t('Los martes estamos cerrados. Elige otro día.', 'We are closed on Tuesdays. Please pick another day.')
    return undefined
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (!nombre.trim()) next.nombre = t('Escribe tu nombre para la reservación.', 'Enter your name for the reservation.')
    const fechaError = !fecha ? t('Elige el día de tu visita.', 'Choose the day of your visit.') : validateOtherDate(fecha)
    if (fechaError) next.fecha = fechaError
    if (!hora) next.hora = t('Elige la hora de llegada.', 'Choose your arrival time.')
    else if (fecha && slotPassed(fecha, hora)) next.hora = t('Esa hora ya pasó hoy. Elige una más tarde.', 'That time has already passed today. Pick a later one.')
    setErrors(next)
    if (Object.keys(next).length) {
      if (next.nombre) nameRef.current?.focus()
      return
    }
    openWhatsApp(buildReservationMessage({ nombre, personas, fecha, hora, comentario }))
    setSent(true)
  }

  const summary =
    fecha && hora
      ? `${dateLabel(fecha, lang, { weekday: 'long', day: 'numeric', month: 'long' })} · ${hora} · ${personas} ${t(personas === 1 ? 'persona' : 'personas', personas === 1 ? 'guest' : 'guests')}`
      : t('Elige día y hora para ver tu reservación', 'Pick a day and time to see your booking')

  return (
    <section id="reservar" aria-labelledby="reservar-title" className="relative overflow-hidden bg-foam px-5 pt-20 pb-20 text-deep sm:px-8 sm:pt-28 sm:pb-24 md:pt-36 md:pb-28">
      {/* Resplandor dorado que se desvanece antes del borde inferior (debajo siguen los listones sobre espuma) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-56 bottom-0 size-[760px] bg-[radial-gradient(closest-side,rgb(242_177_52/0.24),rgb(242_177_52/0.08)_55%,transparent)]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-14">
        {/* Columna izquierda */}
        <div>
          <Eyebrow>{t('Reservaciones', 'Reservations')}</Eyebrow>
          <RevealTitle
            id="reservar-title"
            text={t('Aparta\n*tu mesa*', 'Book\n*a table*')}
            className="mt-6 font-display text-[clamp(3rem,5.6vw,5.75rem)] leading-[0.9] tracking-[-0.03em] whitespace-nowrap"
          />
          <p className="mt-6 max-w-md text-lg text-deep/75">
            {t(
              'Para tu cumpleaños, una reunión familiar o la comida del domingo. Te respondemos por WhatsApp para confirmar.',
              'For a birthday, a family get-together or Sunday lunch. We reply on WhatsApp to confirm.',
            )}
          </p>
          <div className="relative mt-10 hidden lg:block">
            <ParallaxImg
              src={REAL.fachadaVertical.src}
              alt={REAL.fachadaVertical.alt}
              className="aspect-[4/5] max-w-sm rounded-[2rem] shadow-[0_40px_80px_-40px_rgb(19_50_74/0.6)]"
              strength={10}
            />
            <div className="absolute -right-2 bottom-10 max-w-[240px] rotate-3 rounded-2xl bg-deep p-5 text-foam shadow-xl">
              <p className="text-[11px] font-semibold tracking-[0.25em] text-gold uppercase">{t('Horario', 'Hours')}</p>
              <p className="mt-2 font-display text-2xl">12:00 – 19:00</p>
              <p className="mt-1 text-sm text-foam/80">{t('Lunes y de miércoles a domingo. Martes cerrado.', 'Monday and Wednesday to Sunday. Closed Tuesdays.')}</p>
            </div>
          </div>
        </div>

        {/* Widget */}
        <motion.form
          noValidate
          onSubmit={submit}
          aria-labelledby="reservar-title"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 1, ease: EASE }}
          className="min-w-0 rounded-[2.25rem] border border-deep/10 bg-white p-5 shadow-[0_50px_100px_-50px_rgb(19_50_74/0.55)] max-sm:shadow-[0_36px_64px_-36px_rgb(19_50_74/0.5)] sm:p-9"
        >
          {/* Personas */}
          <fieldset className="min-w-0">
            <legend className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-deep/75 uppercase">
              <UsersIcon className="size-4 text-sunset-deep" /> {t('¿Cuántos son?', 'How many guests?')}
            </legend>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-deep/15 p-1.5 max-sm:w-full max-sm:justify-between">
                <button
                  type="button"
                  onClick={() => setPersonas((n) => Math.max(MIN, n - 1))}
                  aria-disabled={personas <= MIN}
                  aria-label={t('Una persona menos', 'One fewer guest')}
                  className="grid size-11 place-items-center rounded-full bg-sand hover:bg-shell aria-disabled:opacity-40"
                >
                  <MinusIcon className="size-4" />
                </button>
                <output aria-live="polite" className="w-12 text-center font-display text-3xl tabular-nums">
                  {personas}
                </output>
                <button
                  type="button"
                  onClick={() => setPersonas((n) => Math.min(MAX, n + 1))}
                  aria-disabled={personas >= MAX}
                  aria-label={t('Una persona más', 'One more guest')}
                  className="grid size-11 place-items-center rounded-full bg-sand hover:bg-shell aria-disabled:opacity-40"
                >
                  <PlusIcon className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:justify-between">
                {[2, 4, 6, 8, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPersonas(n)}
                    aria-pressed={personas === n}
                    className={`h-11 min-w-11 rounded-full border px-3 text-sm font-semibold transition-colors ${
                      personas === n ? 'border-deep bg-deep text-foam' : 'border-deep/15 hover:border-deep/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          {/* Día */}
          <fieldset className="mt-9 min-w-0">
            <legend className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-deep/75 uppercase">
              <CalendarIcon className="size-4 text-sunset-deep" /> {t('¿Qué día?', 'Which day?')}
            </legend>
            <div className="scrollbar-none -mx-5 mt-4 flex snap-x gap-2 overflow-x-auto px-5 pb-2 max-sm:scroll-px-5 sm:-mx-9 sm:scroll-px-9 sm:px-9">
              {days.map((iso, i) => {
                const closed = dayClosed(iso)
                const full = dayFull(iso)
                const disabled = closed || full
                const selected = fecha === iso
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => pickDate(iso)}
                    aria-pressed={selected}
                    aria-label={`${dateLabel(iso, lang, { weekday: 'long', day: 'numeric', month: 'long' })}${closed ? ` (${t('cerrado', 'closed')})` : full ? ` (${t('sin horarios hoy', 'no times left today')})` : ''}`}
                    className={`flex w-[74px] shrink-0 snap-start flex-col items-center rounded-2xl border py-3 transition-colors ${
                      selected
                        ? 'border-deep bg-deep text-foam'
                        : disabled
                          ? 'cursor-not-allowed border-dashed border-deep/15 text-deep/50'
                          : 'border-deep/15 hover:border-deep/40'
                    }`}
                  >
                    <span className="text-[11px] font-semibold uppercase">
                      {i === 0 ? t('Hoy', 'Today') : i === 1 ? t('Mañana', 'Tmrw') : dateLabel(iso, lang, { weekday: 'short' }).replace('.', '')}
                    </span>
                    <span className="mt-1 font-display text-2xl">{dateLabel(iso, lang, { day: 'numeric' })}</span>
                    <span className="text-[11px] sm:text-[10px]">
                      {closed ? t('Cerrado', 'Closed') : dateLabel(iso, lang, { month: 'short' }).replace('.', '')}
                    </span>
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setShowOther((v) => !v)}
                aria-expanded={showOther}
                className="flex w-[74px] shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-deep/30 py-3 text-[11px] font-semibold hover:border-deep/60"
              >
                <CalendarIcon className="mb-1 size-5" />
                {t('Otra fecha', 'Other date')}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {showOther ? (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <label htmlFor={`${uid}-otra`} className="mt-3 block text-sm font-semibold">
                    {t('Elige otra fecha', 'Pick another date')}
                  </label>
                  <input
                    id={`${uid}-otra`}
                    type="date"
                    min={today}
                    value={fecha}
                    onChange={(e) => {
                      const iso = e.target.value
                      setFecha(iso)
                      setErrors((er) => ({ ...er, fecha: iso ? validateOtherDate(iso) : undefined }))
                      fitPartTo(iso)
                    }}
                    className="mt-2 h-12 w-full max-w-xs rounded-xl border border-deep/20 px-3 text-base"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <p aria-live="polite" className="mt-2 text-sm font-medium text-sunset-darker sm:min-h-5">
              {errors.fecha}
            </p>
          </fieldset>

          {/* Hora */}
          <fieldset className="mt-5 min-w-0">
            <legend className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-deep/75 uppercase">
              <ClockIcon className="size-4 text-sunset-deep" /> {t('¿A qué hora?', 'What time?')}
            </legend>
            <div className="mt-5 rounded-[1.4rem] border border-deep/10 bg-sand/45 px-2 py-4 sm:px-4">
              <DayPartSwitch value={part} onChange={choosePart} />
            </div>
            <motion.div
              key={part}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              className={`mt-4 grid gap-2 ${part === 'mediodia' ? 'grid-cols-4 sm:grid-cols-8' : 'grid-cols-3 sm:grid-cols-6'}`}
            >
              {PART_SLOTS[part].map((slot) => {
                const passed = fecha ? slotPassed(fecha, slot) : false
                const selected = hora === slot
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={passed}
                    onClick={() => {
                      setHora(slot)
                      setSent(false)
                      setErrors((e) => ({ ...e, hora: undefined }))
                    }}
                    aria-pressed={selected}
                    className={`h-11 rounded-xl border text-sm font-semibold tabular-nums transition-colors ${
                      selected
                        ? 'border-sunset-deep bg-sunset-deep text-white'
                        : passed
                          ? 'cursor-not-allowed border-dashed border-deep/15 text-deep/45 line-through'
                          : 'border-deep/15 hover:border-deep/40'
                    }`}
                  >
                    {slot}
                  </button>
                )
              })}
            </motion.div>
            {fecha && part === 'mediodia' && !partOpen(fecha, 'mediodia') && partOpen(fecha, 'tarde') ? (
              <p className="mt-3 text-sm text-deep/80">
                {t('Hoy ya pasaron los horarios de mediodía: elige la tarde u otro día.', 'Today’s midday times have passed: choose the afternoon or another day.')}
              </p>
            ) : null}
            <p aria-live="polite" className="mt-2 text-sm font-medium text-sunset-darker sm:min-h-5">
              {errors.hora}
            </p>
          </fieldset>

          {/* Nombre y comentario */}
          <div className="mt-7 grid gap-5 sm:mt-5 sm:grid-cols-2 sm:gap-4">
            <div>
              <label htmlFor={`${uid}-nombre`} className="text-sm font-semibold">
                {t('Nombre', 'Name')}
              </label>
              <input
                ref={nameRef}
                id={`${uid}-nombre`}
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  setErrors((er) => ({ ...er, nombre: undefined }))
                }}
                autoComplete="name"
                maxLength={60}
                aria-invalid={Boolean(errors.nombre)}
                aria-describedby={errors.nombre ? `${uid}-nombre-error` : undefined}
                placeholder={t('¿A nombre de quién?', 'Who is the booking for?')}
                className={`mt-2 h-12 w-full rounded-xl border px-4 text-base placeholder:text-deep/60 ${errors.nombre ? 'border-sunset-darker bg-sunset/5' : 'border-deep/20'}`}
              />
              <p id={`${uid}-nombre-error`} aria-live="polite" className="mt-1.5 text-sm font-medium text-sunset-darker sm:min-h-5">
                {errors.nombre}
              </p>
            </div>
            <div>
              <label htmlFor={`${uid}-comentario`} className="flex justify-between text-sm font-semibold">
                {t('Comentario', 'Comment')} <span className="font-normal text-deep/70">{t('Opcional', 'Optional')}</span>
              </label>
              <input
                id={`${uid}-comentario`}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={280}
                placeholder={t('Ej. es un cumpleaños', 'e.g. it’s a birthday')}
                className="mt-2 h-12 w-full rounded-xl border border-deep/20 px-4 text-base placeholder:text-deep/60"
              />
            </div>
          </div>

          {/* Resumen y envío */}
          <div className="mt-7 flex flex-col gap-4 rounded-2xl bg-sand p-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <p className={`text-sm first-letter:uppercase ${fecha && hora ? 'font-semibold text-deep' : 'text-deep/75'}`} aria-live="polite">
              {summary}
            </p>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-full bg-sunset-deep px-4 text-center leading-tight font-semibold text-white shadow-[0_12px_28px_-12px_rgb(196_68_30/0.8)] hover:bg-sunset-darker sm:gap-2.5 sm:px-7"
            >
              <WhatsAppIcon className="size-5" /> {t('Solicitar por WhatsApp', 'Request on WhatsApp')}
            </motion.button>
          </div>
          <AnimatePresence>
            {sent ? (
              <motion.p
                role="status"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 flex items-start gap-2 text-sm font-medium text-emerald-800"
              >
                <CheckIcon className="mt-0.5 size-4 shrink-0" />
                {t(
                  'Abrimos WhatsApp con tu solicitud. Tu reservación queda confirmada cuando te respondamos.',
                  'We opened WhatsApp with your request. Your booking is confirmed once we reply.',
                )}
              </motion.p>
            ) : null}
          </AnimatePresence>
          <p className="mt-5 flex items-start gap-2 text-[13px] text-deep/70 sm:mt-4 sm:text-xs">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
            <span>
              {t('Dudas o grupos grandes', 'Questions or large groups')}: <span className="whitespace-nowrap">{SITE.telefono.display}</span>
              <span className="max-sm:hidden"> · </span>
              <span className="whitespace-nowrap max-sm:mt-0.5 max-sm:block">WhatsApp {SITE.whatsapp.display}</span>
            </span>
          </p>
        </motion.form>
      </div>
    </section>
  )
}
