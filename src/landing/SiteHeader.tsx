import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import logo from '../assets/logo-marlin-256.webp'
import AnnouncementBanner from '../components/AnnouncementBanner'
import { CloseIcon, MenuIcon, PhoneIcon } from '../components/icons'
import { getFocusable, lockBodyScroll, useHeaderHeightVar } from '../components/navbar/shared'
import { WhatsAppCta } from '../components/WhatsAppCta'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { useOpenStatus } from '../lib/hours'
import { EASE } from '../lib/motion'

/** Enlaces del sitio en orden de importancia: lo que viene a hacer el cliente primero. */
export function useLandingLinks() {
  const { t } = useLang()
  return [
    { href: '#menu', label: t('Menú', 'Menu') },
    { href: '#pedir', label: t('Pedir', 'Order') },
    { href: '#reservar', label: t('Reservar', 'Book') },
    { href: '#nosotros', label: t('Nosotros', 'About') },
    { href: '#visitanos', label: t('Visítanos', 'Visit us') },
  ]
}

/** Cambio de idioma ES / EN. */
export function LangToggle({ className = '', large = false }: { className?: string; large?: boolean }) {
  const { lang, setLang, t } = useLang()
  const pillId = useId()
  return (
    <div role="group" aria-label={t('Idioma', 'Language')} className={`flex rounded-full border border-white/20 bg-white/10 p-1 ${className}`}>
      {(['es', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          aria-label={code === 'es' ? 'Español' : 'English'}
          className={`relative rounded-full text-xs font-bold tracking-wider uppercase transition-colors ${large ? 'h-10 w-13' : 'h-8 w-10'} ${lang === code ? 'text-deep' : 'text-foam/80 hover:text-foam'}`}
        >
          {lang === code ? <motion.span layoutId={`lang-pill-${pillId}`} className="absolute inset-0 rounded-full bg-gold" transition={{ duration: 0.4, ease: EASE }} /> : null}
          <span className="relative">{code}</span>
        </button>
      ))}
    </div>
  )
}

/** Marca: escudo del marlín + nombre + "Desde 2004". */
export function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useLang()
  return (
    <a href="#inicio" className="group flex shrink-0 items-center gap-3 rounded-full" aria-label={`${SITE.nombre}, ${t('ir al inicio', 'back to top')}`}>
      <img
        src={logo}
        alt=""
        width={48}
        height={48}
        className={`shrink-0 drop-shadow-[0_6px_14px_rgb(0_0_0/0.35)] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:rotate-[-8deg] ${
          compact ? 'size-10' : 'size-11 sm:size-12'
        }`}
      />
      <span className="flex flex-col leading-none whitespace-nowrap">
        <span className="font-display text-[19px] tracking-tight sm:text-[21px]">
          Mariscos <em className="text-gold">Carlos</em>
        </span>
        <span className="mt-1 text-[9px] font-semibold tracking-[0.3em] uppercase opacity-75">
          {t('Desde', 'Since')} {SITE.desde}
        </span>
      </span>
    </a>
  )
}

/**
 * Encabezado de la landing: transparente sobre el video y, al hacer scroll, una cápsula oscura
 * translúcida. Incluye el aviso del día, el cambio de idioma y el menú móvil a pantalla completa.
 */
export default function SiteHeader() {
  const { t } = useLang()
  const links = useLandingLinks()
  const headerRef = useRef<HTMLElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)
  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 })
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const sheetId = useId()

  useHeaderHeightVar(headerRef)

  // Alto del aviso del día en --ann-h (sobre el <header>): en el celular, al bajar, el encabezado
  // sube justo esa altura para que sólo quede la cápsula. Es un translate (no cambia el alto del
  // header ni --header-h), así que nada de la página salta.
  useEffect(() => {
    const header = headerRef.current
    const banner = bannerRef.current
    if (!header || !banner || typeof ResizeObserver !== 'function') return
    const update = () => header.style.setProperty('--ann-h', `${Math.ceil(banner.getBoundingClientRect().height)}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(banner)
    return () => observer.disconnect()
  }, [])

  useMotionValueEvent(scrollY, 'change', (y) => {
    const next = y > 60
    // Sólo cambia de estado al cruzar el umbral (evita re-renderizar en cada cuadro).
    setScrolled((prev) => (prev === next ? prev : next))
  })

  return (
    <>
      <motion.div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[61] h-[3px] origin-left bg-linear-to-r from-gold via-sunset to-sunset"
        style={{ scaleX: progress }}
      />
      <header
        ref={headerRef}
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          // Celular: al bajar se oculta el aviso (vuelve al regresar arriba o si recibe el foco del teclado).
          scrolled ? 'max-md:[&:not(:has([data-ann]_:focus-visible))]:-translate-y-(--ann-h)' : ''
        }`}
      >
        <div ref={bannerRef} data-ann="" className="pointer-events-auto w-full">
          <AnnouncementBanner />
        </div>
        <nav
          aria-label={t('Principal', 'Main')}
          className={`pointer-events-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-6xl items-center justify-between gap-3 rounded-full border py-2 pr-2 pl-3 text-foam transition-[background-color,border-color,box-shadow] duration-500 sm:mt-4 sm:pl-4 ${
            scrolled ? 'border-white/10 bg-night/75 shadow-[0_18px_50px_-20px_rgb(0_0_0/0.65)] backdrop-blur-xl' : 'border-transparent bg-transparent'
          }`}
        >
          <Brand />
          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="group relative inline-flex h-10 items-center px-3 text-[14px] font-medium text-foam/85 transition-colors hover:text-foam">
                  {link.label}
                  <span className="absolute inset-x-3 bottom-2 h-px origin-left scale-x-0 bg-gold transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <LangToggle className="hidden sm:flex" />
            <span className="hidden md:block">
              <WhatsAppCta size="sm" label={t('Pedir ahora', 'Order now')} />
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls={sheetId}
              aria-label={t('Abrir menú', 'Open menu')}
              className="grid size-11 place-items-center rounded-full border border-white/20 bg-white/10 text-foam transition-colors hover:bg-white/20 lg:hidden"
            >
              <MenuIcon className="size-5" />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>{open ? <MobileSheet id={sheetId} onClose={() => setOpen(false)} /> : null}</AnimatePresence>
    </>
  )
}

/** Menú móvil a pantalla completa con fondo nocturno y enlaces grandes. */
function MobileSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useLang()
  const links = useLandingLinks()
  const ref = useRef<HTMLDivElement>(null)
  const status = useOpenStatus()

  useEffect(() => {
    const unlock = lockBodyScroll()
    const opener = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab' && ref.current) {
        const items = getFocusable(ref.current)
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      unlock()
      opener?.focus?.()
    }
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={t('Menú', 'Menu')}
      className="fixed inset-0 z-[75] flex flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-night text-foam"
      initial={{ clipPath: 'circle(0% at 92% 4%)' }}
      animate={{ clipPath: 'circle(150% at 92% 4%)' }}
      exit={{ clipPath: 'circle(0% at 92% 4%)' }}
      transition={{ duration: 0.8, ease: EASE }}
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-[480px] rounded-full bg-sunset/25 blur-3xl" />
        <div className="absolute -bottom-48 -left-40 size-[520px] rounded-full bg-ocean/30 blur-3xl" />
      </div>
      {/* Arriba sólo marca + cerrar: con el idioma también, a 360 px el botón de cerrar se salía del borde. */}
      <div className="relative flex items-center justify-between gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Brand compact />
        <button type="button" onClick={onClose} aria-label={t('Cerrar menú', 'Close menu')} className="grid size-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10">
          <CloseIcon className="size-5" />
        </button>
      </div>
      <nav aria-label={t('Secciones', 'Sections')} className="relative flex flex-1 flex-col justify-center px-6 pt-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <ul className="flex flex-col gap-1">
          {links.map((link, i) => (
            <motion.li key={link.href} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.25 + i * 0.07 }}>
              <a href={link.href} onClick={onClose} className="flex items-baseline gap-4 py-2 font-display text-[44px] leading-none tracking-tight text-foam transition-colors hover:text-gold">
                <span className="w-6 shrink-0 font-sans text-xs font-semibold tracking-widest text-gold/80 tabular-nums">0{i + 1}</span>
                {link.label}
              </a>
            </motion.li>
          ))}
        </ul>
        <motion.div className="mt-10 flex flex-col gap-4" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.65 }}>
          <WhatsAppCta size="lg" className="w-full" onNavigate={onClose} />
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-foam/80">
            <p className="flex items-center gap-2 font-semibold text-foam">
              <span className={`size-2 rounded-full ${status.isOpen ? 'bg-emerald-400' : 'bg-sunset'}`} aria-hidden="true" />
              {status.isOpen ? t('Abierto ahora', 'Open now') : t('Cerrado ahora', 'Closed now')}
            </p>
            <p className="mt-2 leading-relaxed">{t('Lunes y de miércoles a domingo, 12:00 a 19:00. Martes cerrado.', 'Monday and Wednesday to Sunday, 12:00 to 19:00. Closed Tuesdays.')}</p>
            <a href={SITE.telefono.href} className="mt-1 -mb-3 inline-flex min-h-11 items-center gap-2 font-semibold text-gold">
              <PhoneIcon className="size-4" /> {SITE.telefono.display}
            </a>
          </div>
          {/* Idioma abajo, al alcance del pulgar. La etiqueta va en ambos idiomas a propósito. */}
          <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 py-2 pr-2 pl-5">
            <span className="text-sm font-semibold text-foam/80">Idioma · Language</span>
            <LangToggle large />
          </div>
        </motion.div>
      </nav>
    </motion.div>
  )
}
