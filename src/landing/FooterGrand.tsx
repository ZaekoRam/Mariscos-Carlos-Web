import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo-marlin-256.webp'
import { CalendarIcon, FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, WhatsAppIcon } from '../components/icons'
import { WhatsAppCta } from '../components/WhatsAppCta'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { useMenuText } from '../i18n/menuText'
import { whatsappUrl } from '../lib/whatsapp'
import PopOutCrew from './fx/PopOutCrew'
import ShutterWordmark from './fx/ShutterWordmark'
import { VIDEOS } from './media'
import { BgVideo, RevealTitle } from './primitives'
import { LangToggle, useLandingLinks } from './SiteHeader'

/** Cierre: llamada a la acción sobre video, contacto y el nombre gigante del restaurante. */
export default function FooterGrand() {
  const { t } = useLang()
  const mt = useMenuText()
  const links = useLandingLinks()
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const videoY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])

  // En celular no hay hover: la tripulación se asoma una vez cuando el botón entra en pantalla.
  const ctaRef = useRef<HTMLSpanElement>(null)
  const ctaInView = useInView(ctaRef, { amount: 1 })
  const crewShown = useRef(false)
  const [crewOn, setCrewOn] = useState(false)
  useEffect(() => {
    if (!ctaInView || crewShown.current || reduce || !window.matchMedia('(hover: none)').matches) return
    // Sólo si el botón se queda en pantalla un momento (no al pasar de largo con el scroll).
    const on = window.setTimeout(() => {
      crewShown.current = true
      setCrewOn(true)
    }, 600)
    return () => window.clearTimeout(on)
  }, [ctaInView, reduce])
  useEffect(() => {
    if (!crewOn) return
    const off = window.setTimeout(() => setCrewOn(false), 2500)
    return () => window.clearTimeout(off)
  }, [crewOn])

  return (
    <footer ref={ref} className="relative isolate overflow-clip bg-night text-foam">
      {/* Llamada a la acción: el video queda recortado dentro de este bloque */}
      <div className="relative isolate overflow-clip px-5 pt-24 pb-16 sm:px-8 sm:pt-28 sm:pb-24 md:pt-40">
        <motion.div aria-hidden="true" className="absolute -inset-y-[10%] inset-x-0 -z-10 opacity-45" style={reduce ? undefined : { y: videoY }}>
          <BgVideo video={VIDEOS.palms} />
        </motion.div>
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-night via-night/55 to-night" />
        <div className="mx-auto max-w-7xl text-center">
          <RevealTitle
            as="p"
            text={t('¿Se te antojó?\n*Ven a probarlos.*', 'Hungry yet?\n*Come try them.*')}
            className="font-display text-[clamp(3rem,9vw,8.5rem)] leading-[0.88] tracking-[-0.03em]"
            accentClassName="italic text-gold"
          />
          {/* En celular los dos botones van apilados y con el mismo ancho. */}
          <div className="mt-20 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-24">
            <span ref={ctaRef} className="group relative inline-flex max-sm:w-full max-sm:max-w-[20rem]">
              <PopOutCrew size="lg" active={crewOn} />
              <WhatsAppCta size="lg" className="max-sm:w-full" />
            </span>
            <a href="#reservar" className="inline-flex h-14 items-center gap-2.5 rounded-full border border-white/30 px-7 font-semibold transition-colors hover:bg-white/10 max-sm:w-full max-sm:max-w-[20rem] max-sm:justify-center">
              <CalendarIcon className="size-5" /> {t('Reservar mesa', 'Book a table')}
            </a>
          </div>
        </div>
      </div>

      {/* Celular: una sola columna con líneas finas entre bloques y filas táctiles de 44 px. */}
      <div className="relative border-t border-white/10 bg-night px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 max-md:gap-8 md:grid-cols-2 lg:grid-cols-[1.15fr_1.25fr_1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-4">
              <img src={logo} alt="" width={72} height={72} className="size-18 max-md:size-16" />
              <div>
                <p className="font-display text-3xl leading-none">
                  Mariscos <em className="text-gold">Carlos</em>
                </p>
                <p className="mt-2 text-xs font-semibold tracking-[0.3em] text-foam/70 uppercase max-sm:leading-5 max-sm:tracking-[0.24em]">
                  {t('Los más frescos', 'The freshest')}
                  <span className="max-sm:hidden"> ·</span> <br className="sm:hidden" />
                  {t('desde', 'since')} {SITE.desde}
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-xs text-foam/75 max-md:mt-5 max-md:text-pretty">{t(`${SITE.tagline}. Mariscos en ${SITE.ciudad}.`, `The best dishes from the sea. Seafood in ${SITE.ciudad}.`)}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2 max-md:gap-3">
              <a href={SITE.redes.facebook} target="_blank" rel="noopener noreferrer" aria-label={t('Facebook de Mariscos Carlos', 'Mariscos Carlos on Facebook')} className="grid size-11 place-items-center rounded-full border border-white/20 transition-colors hover:bg-white/10">
                <FacebookIcon className="size-5" />
              </a>
              <a href={SITE.redes.instagram} target="_blank" rel="noopener noreferrer" aria-label={t('Instagram de Mariscos Carlos', 'Mariscos Carlos on Instagram')} className="grid size-11 place-items-center rounded-full border border-white/20 transition-colors hover:bg-white/10">
                <InstagramIcon className="size-5" />
              </a>
              <LangToggle className="ml-2 max-md:ml-auto max-md:[&_button]:h-10 max-md:[&_button]:w-12" />
            </div>
          </div>

          <div className="max-md:border-t max-md:border-white/10 max-md:pt-8">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase">{t('Contacto', 'Contact')}</p>
            <ul className="mt-5 space-y-3 text-foam/85 max-md:mt-3 max-md:space-y-1">
              <li>
                <a href={SITE.telefono.href} className="inline-flex items-center gap-3 hover:text-foam max-md:flex max-md:min-h-11">
                  <span className="contents max-md:grid max-md:size-9 max-md:shrink-0 max-md:place-items-center max-md:rounded-full max-md:bg-white/[0.06] max-md:ring-1 max-md:ring-white/10">
                    <PhoneIcon className="size-4 text-gold" />
                  </span>{' '}
                  {SITE.telefono.display}
                </a>
              </li>
              <li>
                <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 hover:text-foam max-md:flex max-md:min-h-11">
                  <span className="contents max-md:grid max-md:size-9 max-md:shrink-0 max-md:place-items-center max-md:rounded-full max-md:bg-white/[0.06] max-md:ring-1 max-md:ring-white/10">
                    <WhatsAppIcon className="size-4 text-gold" />
                  </span>{' '}
                  {SITE.whatsapp.display}
                </a>
              </li>
              <li>
                <a href={`mailto:${SITE.email}`} className="inline-flex items-center gap-3 [overflow-wrap:anywhere] hover:text-foam max-md:flex max-md:min-h-11">
                  <span className="contents max-md:grid max-md:size-9 max-md:shrink-0 max-md:place-items-center max-md:rounded-full max-md:bg-white/[0.06] max-md:ring-1 max-md:ring-white/10">
                    <MailIcon className="size-4 shrink-0 text-gold" />
                  </span>{' '}
                  {SITE.email}
                </a>
              </li>
            </ul>
          </div>

          <div className="max-md:border-t max-md:border-white/10 max-md:pt-8">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase">{t('Visítanos', 'Visit us')}</p>
            <p className="mt-5 text-foam/85 max-md:mt-4 max-md:text-pretty">{SITE.direccion}</p>
            <p className="mt-2 text-sm text-foam/70 max-md:mt-1.5 max-md:text-pretty">{t(SITE.referencia, 'Near the bus station, right behind it.')}</p>
            <p className="mt-4 text-foam/85 max-md:text-pretty">
              {t('Lunes y de miércoles a domingo, 12:00 a 19:00. Martes cerrado.', 'Monday and Wednesday to Sunday, 12:00 to 19:00. Closed Tuesdays.')}
            </p>
          </div>

          <nav aria-label={t('Pie de página', 'Footer')} className="max-md:border-t max-md:border-white/10 max-md:pt-8">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase">{t('Secciones', 'Sections')}</p>
            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-foam/85 max-md:mt-2 max-md:gap-y-0 lg:grid-cols-1">
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="inline-block py-0.5 hover:text-foam max-md:flex max-md:min-h-11 max-md:items-center max-md:py-0">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[11px] font-semibold tracking-[0.3em] text-foam/70 uppercase max-md:mt-7">{t('Demo para el restaurante', 'Restaurant demo')}</p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-foam/80 max-md:gap-2">
              <li>
                <Link to="/mesero" className="hover:text-foam max-md:inline-flex max-md:h-11 max-md:items-center max-md:rounded-full max-md:border max-md:border-white/15 max-md:px-5">{t('Mesero', 'Waiter')}</Link>
              </li>
              <li>
                <Link to="/cocina" className="hover:text-foam max-md:inline-flex max-md:h-11 max-md:items-center max-md:rounded-full max-md:border max-md:border-white/15 max-md:px-5">{t('Cocina', 'Kitchen')}</Link>
              </li>
              <li>
                <Link to="/qr" className="hover:text-foam max-md:inline-flex max-md:h-11 max-md:items-center max-md:rounded-full max-md:border max-md:border-white/15 max-md:px-5">QR</Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="relative bg-night px-5 pt-4 pb-8 sm:px-6 sm:pb-10">
        <ShutterWordmark />
      </div>
      {/* Abajo deja libre la barra fija del celular (≈ 82 px + zona segura del iPhone). */}
      <div className="relative border-t border-white/10 bg-night px-5 pt-6 pb-[calc(7.5rem+env(safe-area-inset-bottom))] text-xs text-foam/70 sm:px-8 max-md:pt-7 max-md:text-[13px] max-md:leading-relaxed md:pb-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 max-md:gap-1 sm:flex-row sm:justify-between">
          <p className="max-md:text-pretty">{mt.notas.facturacion}</p>
          <p>
            © {new Date().getFullYear()} {SITE.nombre} · {SITE.ciudad}
          </p>
        </div>
      </div>
    </footer>
  )
}
