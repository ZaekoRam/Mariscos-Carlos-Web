import { motion, useReducedMotion } from 'motion/react'
import { ArrowRightIcon, ExternalIcon, MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from '../components/icons'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { getZonedNow, SCHEDULE, useOpenStatus } from '../lib/hours'
import { EASE } from '../lib/motion'
import { whatsappUrl } from '../lib/whatsapp'
import FoldedMap from './fx/FoldedMap'
import { REAL } from './media'
import { Eyebrow, FadeIn, RevealTitle } from './primitives'

const DAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SERVICE_EN: Record<string, string> = {
  'Consumo en el lugar': 'Dine-in',
  'Terraza y mesas al aire libre': 'Terrace and outdoor tables',
  'Retiro en el negocio': 'Pickup at the restaurant',
}

/** Escenario oscuro del mapa: luz cálida de lámpara + anillos náuticos muy tenues. */
const STAGE_BG = [
  'radial-gradient(52% 58% at 34% 50%, rgb(242 177 52 / 0.17), transparent 72%)',
  'repeating-radial-gradient(circle at 96% 4%, transparent 0 30px, rgb(251 246 236 / 0.05) 30px 31px)',
  'linear-gradient(160deg, #13324A 0%, #0F2A3D 48%, #0A1B28 100%)',
].join(', ')

/** Ubicación (mapa ilustrativo + foto real), horario con estado en vivo (hora de Ciudad de México) y contacto. */
export default function Visit() {
  const { t, lang } = useLang()
  const reduce = useReducedMotion() ?? false
  const status = useOpenStatus()
  const today = getZonedNow().weekday
  const street = SITE.direccion.split(',')[0]
  const reference = t(SITE.referencia, 'Near the bus station, right behind it.')
  const newTab = t('(se abre en una pestaña nueva)', '(opens in a new tab)')
  const detail =
    lang === 'en'
      ? status.detail
          .replace('Cierra a las', 'Closes at')
          .replace('Abre hoy a las', 'Opens today at')
          .replace('Abre mañana a las', 'Opens tomorrow at')
          .replace(/Abre el (\S+) a las/, (_, day: string) => {
            const i = SCHEDULE.find((d) => d.nombre.toLowerCase() === day.toLowerCase())?.dia
            return `Opens ${i === undefined ? day : DAY_EN[i]} at`
          })
      : status.detail
  const dayName = (dia: number, nombre: string) => (lang === 'en' ? DAY_EN[dia] : nombre)
  const dayShort = (dia: number) => (lang === 'en' ? DAY_SHORT_EN[dia] : DAY_SHORT_ES[dia])

  const steps = [
    {
      title: t('Central de Autobuses', 'Bus station'),
      text: t('Llega a la zona de la Central de Autobuses de Manzanillo.', 'Head to the Manzanillo bus station area.'),
    },
    {
      title: t('Detrás de la central', 'Behind the station'),
      text: t('Estamos justo detrás de la central.', 'We are right behind the station.'),
    },
    {
      title: 'Mariscos Carlos',
      text: t(`${street}. Busca las palmeras de la entrada.`, `${street.replace(' esq. ', ' & ')}. Look for the palm trees out front.`),
    },
  ]

  const [emailUser, emailDomain] = SITE.email.split('@')
  const contacts = [
    { label: t('Teléfono', 'Phone'), value: SITE.telefono.display, href: SITE.telefono.href, Icon: PhoneIcon, external: false, nowrap: true },
    { label: 'WhatsApp', value: SITE.whatsapp.display, href: whatsappUrl(), Icon: WhatsAppIcon, external: true, nowrap: true },
    {
      label: t('Correo', 'Email'),
      value: (
        <>
          {emailUser}
          <wbr />@{emailDomain}
        </>
      ),
      href: `mailto:${SITE.email}`,
      Icon: MailIcon,
      external: false,
      nowrap: false,
    },
  ]

  return (
    <section id="visitanos" aria-labelledby="visitanos-title" className="relative bg-foam px-5 pt-20 pb-24 text-deep sm:px-8 sm:py-28 md:py-36">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>{t('Visítanos', 'Visit us')}</Eyebrow>
            <RevealTitle
              id="visitanos-title"
              text={t('Te esperamos\n*en Manzanillo*', 'See you\n*in Manzanillo*')}
              className="mt-6 font-display text-[clamp(2.75rem,6.5vw,6rem)] leading-[0.92] tracking-[-0.025em]"
            />
          </div>
          {/* En celular ya aparece en la tarjeta de dirección (y en los pasos): aquí sólo desde md. */}
          <p className="hidden max-w-sm text-lg text-deep/75 md:block">{reference}</p>
        </div>

        {/* Escenario: mapa doblado + cómo llegar + foto real de la fachada */}
        <FadeIn className="-mx-5 mt-10 sm:mx-0 sm:mt-14">
          <div
            className="relative overflow-hidden px-2 pt-6 pb-10 text-foam shadow-[0_50px_100px_-50px_rgb(10_27_40/0.75)] sm:rounded-[2.5rem] sm:p-6 sm:pb-10 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:p-10"
            style={{ background: STAGE_BG }}
          >
            <FoldedMap className="relative lg:col-span-8" />

            <div className="relative mt-8 px-5 sm:mt-10 sm:grid sm:grid-cols-2 sm:items-center sm:gap-8 sm:px-2 lg:col-span-4 lg:mt-0 lg:block lg:px-0">
              <div>
                <Eyebrow tone="light">{t('Cómo llegar', 'Getting here')}</Eyebrow>
                <h3 className="mt-4 font-display text-[clamp(1.9rem,3vw,2.6rem)] leading-[1.02] tracking-[-0.02em] text-foam">
                  {t('Justo detrás de la ', 'Right behind the ')}
                  <em className="text-gold italic">{t('central', 'bus station')}</em>
                </h3>
                <ol className="mt-7 space-y-5">
                  {steps.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span
                        aria-hidden="true"
                        className={`grid size-8 shrink-0 place-items-center rounded-full font-banner text-sm font-semibold ${
                          i === steps.length - 1 ? 'bg-gold text-night' : 'bg-foam/10 text-gold ring-1 ring-gold/50'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="pt-0.5">
                        <p className="font-banner text-[13px] font-medium tracking-[0.14em] text-foam uppercase">{step.title}</p>
                        <p className="mt-1 text-[15px] leading-relaxed text-foam/75 sm:text-sm">{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <motion.figure
                initial={reduce ? { opacity: 1, y: 0, rotate: 3 } : { opacity: 0, y: 36, rotate: 10 }}
                whileInView={{ opacity: 1, y: 0, rotate: 3 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
                className="relative mx-auto mt-10 w-[min(92%,340px)] bg-white p-3 pb-4 text-deep shadow-[0_30px_60px_-24px_rgb(0_0_0/0.75)] sm:mt-0 sm:w-[min(100%,340px)] lg:mt-12"
              >
                <span aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 bg-shell/90 shadow-sm" />
                <img
                  src={REAL.fachada.src}
                  alt={t(REAL.fachada.alt, 'Mariscos Carlos facade with palm trees')}
                  width={REAL.fachada.width}
                  height={REAL.fachada.height}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] w-full object-cover"
                />
                <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
                  <span className="font-display text-lg whitespace-nowrap italic sm:text-xl lg:text-lg xl:text-xl">{t('Busca esta fachada', 'Look for this facade')}</span>
                  <span className="font-banner text-[11px] tracking-[0.2em] whitespace-nowrap text-deep/70 uppercase sm:text-[10px]">{t('Foto real', 'Real photo')}</span>
                </figcaption>
              </motion.figure>
            </div>
          </div>
        </FadeIn>

        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Dirección y contacto */}
          <FadeIn className="flex flex-col rounded-[2rem] border border-deep/10 bg-white/70 p-7 sm:p-9 lg:col-span-5">
            <div className="flex items-center justify-between gap-4">
              <span className="grid size-11 place-items-center rounded-full bg-sunset-deep/10">
                <MapPinIcon className="size-6 text-sunset-deep" />
              </span>
              <span className="font-banner text-[11px] font-medium tracking-[0.24em] text-deep/70 uppercase">{t('Dirección', 'Address')}</span>
            </div>
            <p className="mt-6 font-display text-[clamp(1.75rem,3vw,2.25rem)] leading-tight">{SITE.direccion}</p>
            <p className="mt-3 text-deep/75">{reference}</p>
            <a
              href={SITE.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 mb-8 inline-flex h-12 items-center justify-center gap-2 self-start rounded-full bg-sunset-deep px-6 font-semibold text-white transition-colors hover:bg-sunset-darker"
            >
              {t('Cómo llegar', 'Get directions')} <ExternalIcon className="size-4" />
              <span className="sr-only">{newTab}</span>
            </a>
            <ul className="mt-auto flex flex-wrap gap-2 border-t border-deep/10 pt-6" aria-label={t('Servicios', 'Services')}>
              {SITE.servicios.map((s) => (
                <li key={s} className="rounded-full border border-deep/15 px-3 py-1.5 text-[13px] text-deep/80 sm:text-xs">
                  {lang === 'en' ? (SERVICE_EN[s] ?? s) : s}
                </li>
              ))}
            </ul>

          </FadeIn>

          {/* Horario con estado en vivo */}
          <FadeIn delay={0.1} className="menu-paper flex flex-col rounded-[2rem] border border-deep/10 p-7 sm:p-9 lg:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-3xl">{t('Horario', 'Hours')}</p>
                <p className="mt-1 text-sm text-deep/75">{detail}</p>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  status.isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-sunset/15 text-sunset-darker'
                }`}
              >
                <span className={`size-2 rounded-full ${status.isOpen ? 'bg-emerald-500' : 'bg-sunset'}`} aria-hidden="true" />
                {status.isOpen ? t('Abierto ahora', 'Open now') : t('Cerrado ahora', 'Closed now')}
              </span>
            </div>

            {/* Móvil: lista vertical */}
            <table className="mt-6 w-full text-[15px] sm:hidden">
              <caption className="sr-only">{t('Horario semanal', 'Weekly hours')}</caption>
              <tbody>
                {SCHEDULE.map((day) => {
                  const isToday = day.dia === today
                  return (
                    <tr
                      key={day.dia}
                      aria-current={isToday ? 'date' : undefined}
                      className={`border-t border-deep/10 ${isToday ? 'font-semibold text-sunset-darker' : day.abre ? 'text-deep' : 'text-deep/60'}`}
                    >
                      <th scope="row" className="py-2.5 text-left font-medium">
                        {dayName(day.dia, day.nombre)}
                        {isToday ? (
                          <span className="ml-2 rounded-full bg-sunset-deep px-2 py-0.5 text-[11px] font-bold tracking-widest text-white uppercase">
                            {t('Hoy', 'Today')}
                          </span>
                        ) : null}
                      </th>
                      <td className="py-2.5 text-right tabular-nums">{day.abre ? `${day.abre} – ${day.cierra}` : t('Cerrado', 'Closed')}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Tableta y escritorio: la semana en columnas */}
            <div className="mt-7 hidden max-h-64 min-h-48 flex-1 sm:block">
              <table className="h-full w-full table-fixed border-separate border-spacing-x-1.5 border-spacing-y-0">
                <caption className="sr-only">{t('Horario semanal', 'Weekly hours')}</caption>
                <thead>
                  <tr>
                    {SCHEDULE.map((day) => {
                      const isToday = day.dia === today
                      const closed = !day.abre
                      return (
                        <th
                          key={day.dia}
                          scope="col"
                          aria-current={isToday ? 'date' : undefined}
                          className={`rounded-t-2xl px-1 pt-4 pb-2 align-top font-banner text-sm font-medium tracking-[0.14em] uppercase ${
                            isToday ? 'bg-deep text-gold' : closed ? 'text-deep/60' : 'bg-sand text-deep'
                          }`}
                        >
                          <span aria-hidden="true">{dayShort(day.dia)}</span>
                          <span className="sr-only">{dayName(day.dia, day.nombre)}</span>
                          {isToday ? <span className="mt-1 block text-[10px] tracking-[0.22em] text-foam/85">{t('Hoy', 'Today')}</span> : null}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {SCHEDULE.map((day) => {
                      const isToday = day.dia === today
                      const closed = !day.abre
                      return (
                        <td
                          key={day.dia}
                          className={`rounded-b-2xl px-1 pt-3 pb-5 text-center align-bottom tabular-nums ${
                            isToday
                              ? 'bg-deep text-foam'
                              : closed
                                ? 'bg-[repeating-linear-gradient(135deg,rgb(19_50_74/0.08)_0_6px,transparent_6px_12px)] text-deep/70'
                                : 'bg-sand text-deep'
                          }`}
                        >
                          {day.abre ? (
                            <>
                              <span className="block font-display text-[clamp(1rem,1.6vw,1.35rem)] leading-none">{day.abre}</span>
                              <span aria-hidden="true" className="mx-auto my-2 block h-4 w-px bg-current opacity-35" />
                              <span className="sr-only"> – </span>
                              <span className="block font-display text-[clamp(1rem,1.6vw,1.35rem)] leading-none">{day.cierra}</span>
                            </>
                          ) : (
                            <span className="text-xs font-semibold tracking-[0.12em] uppercase">{t('Cerrado', 'Closed')}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-auto pt-5 sm:pt-6">
              <p className="border-t border-deep/10 pt-4 text-[13px] text-deep/70 sm:pt-5 sm:text-xs">{t('Hora del centro de México.', 'Central Mexico time.')}</p>
            </div>
          </FadeIn>
        </div>

        {/* Contacto */}
        <FadeIn delay={0.15} className="mt-6">
          <ul className="grid divide-y divide-deep/10 overflow-hidden rounded-[2rem] border border-deep/10 bg-white/70 lg:grid-cols-[1fr_1.1fr_1.3fr] lg:divide-x lg:divide-y-0 xl:grid-cols-[1fr_1.1fr_1.4fr]">
            {contacts.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group flex h-full items-center gap-4 px-6 py-5 transition-colors hover:bg-deep/5 sm:px-7 sm:py-6"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sand text-ocean-deep transition-colors duration-300 group-hover:bg-ocean-deep group-hover:text-white">
                    <c.Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold tracking-[0.16em] text-deep/70 uppercase">{c.label}</span>
                    <span className={`mt-0.5 block font-display text-lg leading-snug sm:text-xl lg:text-lg xl:text-xl ${c.nowrap ? 'whitespace-nowrap' : ''}`}>{c.value}</span>
                    {c.external ? <span className="sr-only">{newTab}</span> : null}
                  </span>
                  {c.external ? (
                    <ExternalIcon className="hidden size-4 shrink-0 text-deep/45 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block lg:hidden xl:block" />
                  ) : (
                    <ArrowRightIcon className="hidden size-4 shrink-0 text-deep/45 transition-transform duration-300 group-hover:translate-x-1 sm:block lg:hidden xl:block" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  )
}
