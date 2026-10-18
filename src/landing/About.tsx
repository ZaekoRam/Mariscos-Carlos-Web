import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { BagIcon, SunIcon, UsersIcon } from '../components/icons'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { ALL_ITEMS } from '../lib/menu'
import { EASE } from '../lib/motion'
import CircularText from './fx/CircularText'
import MarlinSticker from './fx/MarlinSticker'
import { REAL } from './media'
import { CountUp, Eyebrow, FadeIn, ParallaxImg, ScrollRevealText } from './primitives'

const SERVICES = [
  { icon: UsersIcon, title: ['Consumo en el lugar', 'Dine in'], text: ['Mesas para venir en pareja, con amigos o con toda la familia.', 'Tables for couples, friends or the whole family.'] },
  { icon: SunIcon, title: ['Terraza y mesas al aire libre', 'Terrace and outdoor tables'], text: ['Para comer con la brisa de Manzanillo.', 'Eat with the Manzanillo breeze.'] },
  { icon: BagIcon, title: ['Para llevar', 'Takeout'], text: ['Pide por WhatsApp y recoge tu pedido en el negocio.', 'Order on WhatsApp and pick it up at the restaurant.'] },
] as const

const FINE_POINTER = '(hover: hover) and (pointer: fine)'

/** ¿Hay mouse/trackpad? (sólo así el sticker se puede arrastrar; en touch no se atrapa el scroll). */
function useFinePointer() {
  const [fine, setFine] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(FINE_POINTER).matches)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(FINE_POINTER)
    const update = () => setFine(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return fine
}

/** Flechita dibujada a mano que apunta al sticker. */
function HandArrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="M62 10C48 2 26 4 12 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M21.4 16.4L12 20l2.3-9.7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Posavasos azul marino con el anillo de texto que gira y el sticker del marlín pegado al centro.
 * El sticker se puede despegar (hover/toque) y, con mouse, arrastrar por todo el collage.
 */
function MarlinMedallion({ collageRef }: { collageRef: RefObject<HTMLDivElement | null> }) {
  const { t } = useLang()
  const reduce = useReducedMotion() ?? false
  const finePointer = useFinePointer()
  const [ringHover, setRingHover] = useState(false)
  const [stickerActive, setStickerActive] = useState(false)
  const [discovered, setDiscovered] = useState(false)

  const handleActive = useCallback((active: boolean) => {
    setStickerActive(active)
    if (active) setDiscovered(true)
  }, [])

  const onHover = (value: boolean) => (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') setRingHover(value)
  }

  return (
    <div className="relative z-10 -mb-14 flex flex-row-reverse items-start justify-end gap-2 self-start max-md:order-first max-md:col-span-12 md:-mb-28 md:flex-row md:justify-start md:gap-1 lg:absolute lg:-top-14 lg:-left-32 lg:mb-0 lg:gap-0">
      <motion.div
        className="relative size-[136px] shrink-0 md:size-[248px] xl:size-[272px]"
        onPointerEnter={onHover(true)}
        onPointerLeave={onHover(false)}
        initial={reduce ? false : { opacity: 0, scale: 0.86, rotate: -18 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1.1, ease: EASE }}
      >
        {/* Posavasos */}
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden rounded-full shadow-[0_34px_60px_-30px_rgb(10_27_40/0.75),0_2px_0_0_rgb(242_177_52/0.18)_inset]"
          style={{ backgroundImage: 'radial-gradient(circle at 32% 26%, #1f4f6e 0%, #13324a 46%, #0a1b28 100%)' }}
        >
          <div className="film-grain absolute inset-0 opacity-[0.16]" />
          <svg viewBox="0 0 200 200" className="absolute inset-0 size-full" focusable="false">
            <circle cx="100" cy="100" r="94" fill="none" stroke="#F2B134" strokeOpacity="0.38" strokeWidth="0.7" />
            <circle cx="100" cy="100" r="91.5" fill="none" stroke="#F2B134" strokeOpacity="0.14" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#F2B134" strokeOpacity="0.3" strokeWidth="0.6" strokeDasharray="0.6 2.6" strokeLinecap="round" />
          </svg>
        </div>

        <CircularText
          className="absolute inset-0 text-gold"
          text={t(
            `MARISCOS CARLOS • LOS MÁS FRESCOS • DESDE ${SITE.desde} • `,
            `MARISCOS CARLOS • THE FRESHEST • SINCE ${SITE.desde} • `,
          )}
          boost={ringHover || stickerActive}
          radius={77}
          fontSize={12.5}
        />

        <div className="absolute inset-0 grid place-items-center">
          <MarlinSticker className="w-[63%]" constraintsRef={collageRef} draggable={finePointer} onActiveChange={handleActive} />
        </div>
      </motion.div>

      {/* Pista: se apaga en cuanto alguien juega con el sticker */}
      <p
        className={`mt-2 w-[6.75rem] text-right font-display max-md:text-balance text-[14px] leading-snug text-deep/80 italic transition-opacity duration-700 md:mt-8 md:w-[8.5rem] md:text-left md:text-[15px] lg:hidden xl:-ml-1 xl:mt-4 xl:block xl:w-[9.5rem] ${
          discovered ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <HandArrow className="mb-1 ml-auto block h-6 w-10 -scale-x-100 text-sunset-deep md:-ml-1 md:scale-x-100" />
        {finePointer
          ? t('Despégalo y llévatelo por el collage', 'Peel it and drag it around the collage')
          : t('Tócalo para despegarlo', 'Tap it to peel it off')}
      </p>
    </div>
  )
}

/** "Nosotros": presenta el negocio con fotos reales, cifras y servicios. */
export default function About() {
  const { t } = useLang()
  const years = new Date().getFullYear() - SITE.desde
  const collageRef = useRef<HTMLDivElement>(null)

  return (
    <section id="nosotros" aria-labelledby="nosotros-title" className="relative overflow-hidden bg-foam px-5 py-20 text-deep sm:px-8 md:py-36">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 right-[-10%] size-[620px] rounded-full bg-gold/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-8 md:gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)] lg:gap-20">
          <div>
            <Eyebrow>{t('Nosotros', 'About us')}</Eyebrow>
            <h2 id="nosotros-title" className="mt-5 font-display text-4xl leading-[0.95] tracking-tight md:text-5xl">
              {t(`${years} años`, `${years} years`)} <em className="text-sunset-deep">{t('sirviendo el mar', 'serving the sea')}</em> {t('en Manzanillo', 'in Manzanillo')}
            </h2>
          </div>
          <ScrollRevealText
            className="font-display text-[clamp(1.5rem,3.6vw,3.25rem)] leading-[1.12] tracking-[-0.015em] text-deep"
            text={t(
              `Desde *${SITE.desde}* abrimos la cocina con una sola idea: que a tu mesa lleguen *los más frescos.* Aguachiles, cocteles, pulpo y pescado zarandeado, servidos a unos pasos de la Central de Autobuses, para comer aquí, pedir para llevar o celebrar con los tuyos.`,
              `Since *${SITE.desde}* our kitchen has had one simple goal: bring *the freshest seafood* to your table. Aguachiles, cocktails, octopus and grilled fish, served steps from the bus station, to eat here, take out or celebrate with your people.`,
            )}
          />
        </div>

        {/* Collage de fotos reales con parallax */}
        <div ref={collageRef} className="relative mt-12 grid grid-cols-12 gap-3 md:mt-28 md:gap-6">
          <FadeIn className="col-span-7 md:col-span-6 lg:col-span-5">
            <ParallaxImg
              src={REAL.fachadaVertical.src}
              alt={REAL.fachadaVertical.alt}
              className="aspect-[4/5] rounded-[1.5rem] shadow-[0_40px_80px_-40px_rgb(19_50_74/0.55)] md:rounded-[2rem]"
              strength={10}
              caption={t('Nuestra casa en Manzanillo', 'Our place in Manzanillo')}
            />
          </FadeIn>

          <div className="contents md:col-span-6 md:flex md:flex-col md:gap-6 lg:col-span-4 lg:pt-24">
            <FadeIn delay={0.1} className="max-md:order-2 max-md:col-span-12">
              <ParallaxImg
                src={REAL.camarones.src}
                alt={REAL.camarones.alt}
                className="aspect-[16/9] rounded-[1.5rem] shadow-[0_40px_80px_-40px_rgb(19_50_74/0.55)] md:aspect-[4/3] md:rounded-[2rem]"
                strength={14}
                caption={t('Camarones empanizados', 'Breaded shrimp')}
              />
            </FadeIn>
            <FadeIn delay={0.2} className="rounded-[1.5rem] bg-deep p-6 text-foam max-md:order-3 max-md:col-span-12 md:rounded-[2rem] md:p-7">
              <p className="text-[11px] font-semibold tracking-[0.28em] text-gold uppercase">{t('¿Una fecha especial?', 'A special occasion?')}</p>
              <p className="mt-2.5 font-display text-xl leading-snug max-md:text-pretty md:mt-3 md:text-2xl">
                {t('Reserva tu mesa para celebrar tu cumpleaños o alguna reunión familiar.', 'Book a table for your birthday or a family get-together.')}
              </p>
              <a href="#reservar" className="relative mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold after:absolute after:-inset-x-3 after:-inset-y-3 hover:underline md:mt-5">
                {t('Apartar mesa', 'Book a table')} →
              </a>
            </FadeIn>
          </div>

          <div className="contents md:relative md:col-span-12 md:flex md:flex-col md:gap-6 lg:col-span-3 lg:pt-48">
            <MarlinMedallion collageRef={collageRef} />
            <FadeIn delay={0.15} className="max-md:order-1 max-md:col-span-5 max-md:mt-6">
              <ParallaxImg
                src={REAL.coctel.src}
                alt={REAL.coctel.alt}
                className="aspect-[3/4] rounded-[1.5rem] shadow-[0_40px_80px_-40px_rgb(19_50_74/0.55)] md:aspect-[16/10] md:rounded-[2rem] lg:aspect-[3/4]"
                strength={16}
                caption={t('Coctel de camarón', 'Shrimp cocktail')}
              />
            </FadeIn>
          </div>
        </div>

        {/* Cifras */}
        <dl className="mt-14 hidden grid-cols-2 md:grid gap-x-4 gap-y-8 border-t border-deep/15 pt-10 md:mt-28 md:gap-x-6 md:gap-y-12 md:pt-12 lg:grid-cols-4">
          {[
            { value: <CountUp to={SITE.calificacion.google} decimals={1} />, label: t('de calificación en Google', 'Google rating'), extra: '★' },
            { value: <CountUp to={SITE.calificacion.resenasGoogle} prefix="~" />, label: t('reseñas en Google', 'Google reviews') },
            { value: <CountUp to={SITE.calificacion.facebookRecomienda} suffix="%" />, label: t('lo recomienda en Facebook', 'recommend us on Facebook') },
            { value: <CountUp to={ALL_ITEMS.length} />, label: t('platillos en la carta', 'dishes on the menu') },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1, ease: EASE, delay: i * 0.1 }}
            >
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <span className="font-display text-[clamp(2.5rem,7vw,5.5rem)] leading-none tracking-tight text-deep">
                  {stat.value}
                  {stat.extra ? <span className="ml-1 align-top text-[0.45em] text-gold">{stat.extra}</span> : null}
                </span>
                <span className="mt-3 block text-sm text-deep/75 max-md:mt-2">{stat.label}</span>
              </dd>
            </motion.div>
          ))}
        </dl>

        {/* Servicios */}
        <ul className="mt-12 grid gap-3 md:mt-20 md:grid-cols-3 md:gap-4">
          {SERVICES.map(({ icon: Icon, title, text }, i) => (
            <motion.li
              key={title[0]}
              className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 rounded-[1.5rem] border border-deep/10 bg-white/70 p-5 shadow-[0_18px_40px_-28px_rgb(19_50_74/0.45)] transition-shadow hover:shadow-lg md:block md:rounded-[2rem] md:p-7"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, ease: EASE, delay: i * 0.08 }}
            >
              <span className="row-span-2 grid size-12 place-items-center self-start rounded-2xl bg-sand text-sunset-deep transition-transform duration-500 group-hover:rotate-[-8deg]">
                <Icon className="size-6" />
              </span>
              <h3 className="mt-5 font-display text-2xl max-md:mt-0 max-md:text-xl max-md:leading-tight">{t(title[0], title[1])}</h3>
              <p className="mt-2 text-deep/75 max-md:mt-1 max-md:text-[15px] max-md:leading-snug">{t(text[0], text[1])}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
