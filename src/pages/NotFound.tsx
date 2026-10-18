import { motion } from 'motion/react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo.svg'
import { ArrowLeftIcon, ArrowRightIcon } from '../components/icons'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { buttonTap, EASE, staggerContainer, staggerItem } from '../lib/motion'

const MotionLink = motion.create(Link)

const PILL =
  'group relative isolate inline-flex h-12 shrink-0 items-center justify-center gap-2.5 overflow-hidden rounded-full px-6 text-[15px] font-semibold whitespace-nowrap select-none transition-colors duration-300'

const GLINT =
  "before:pointer-events-none before:absolute before:left-[10%] before:top-px before:h-4 before:w-[80%] before:rounded-xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:content-[''] before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.16,1,0.3,1)] hover:before:scale-x-[1.18]"

const WAVE_PATH = 'M0 40 Q 120 10 240 40 T 480 40 T 720 40 T 960 40 T 1200 40 T 1440 40 V 80 H 0 Z'

/** Franja de olas que se desplaza (CSS animate-wave; se detiene con prefers-reduced-motion). */
function WaveBand({ className, fill, slow = false }: { className: string; fill: string; slow?: boolean }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 overflow-hidden ${className}`}>
      <div
        className={`flex h-full w-[200%] animate-wave motion-reduce:animate-none ${slow ? '[animation-duration:20s]' : ''}`}
      >
        {[0, 1].map((i) => (
          <svg key={i} viewBox="0 0 1440 80" preserveAspectRatio="none" className="h-full w-1/2" focusable="false">
            <path d={WAVE_PATH} fill={fill} />
          </svg>
        ))}
      </div>
    </div>
  )
}

export default function NotFound() {
  const { t } = useLang()
  useEffect(() => {
    const previous = document.title
    document.title = `${t('Página no encontrada', 'Page not found')} · ${SITE.nombre}`
    return () => {
      document.title = previous
    }
  }, [t])

  return (
    <main
      id="contenido"
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-sand px-4 sm:px-6"
    >
      {/* Sol de fondo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[12%] left-1/2 -z-10 size-[min(80vw,520px)] -translate-x-1/2 rounded-full bg-linear-to-b from-gold/45 to-sunset/15 blur-2xl"
      />

      <header className="mx-auto flex w-full max-w-6xl items-center py-5">
        <Link to="/" className="inline-flex min-h-10 items-center gap-3 rounded-lg text-deep">
          <img src={logo} alt="" width={40} height={40} className="size-10" />
          <span className="font-display text-xl">{SITE.nombre}</span>
        </Link>
      </header>

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center pt-6 pb-48 text-center md:pb-56"
        variants={staggerContainer(0.1, 0.05)}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={staggerItem}
          aria-hidden="true"
          className="font-display text-[120px] leading-[0.8] font-medium tracking-tighter text-deep/15 select-none sm:text-[168px]"
        >
          4<span className="text-sunset/60 italic">0</span>4
        </motion.p>

        <motion.p
          variants={staggerItem}
          className="mt-4 text-xs font-semibold tracking-[0.18em] text-ocean-deep uppercase"
        >
          {t('Error 404 · Página no encontrada', 'Error 404 · Page not found')}
        </motion.p>

        <motion.h1
          variants={staggerItem}
          className="mt-4 font-display text-[40px] leading-[1.02] tracking-tight text-balance text-deep md:text-6xl"
        >
          {t('Esta página se fue', 'This page went out')}{' '}
          <em className="text-sunset-deep italic">{t('con la marea', 'with the tide')}</em>
        </motion.h1>

        <motion.p
          variants={staggerItem}
          className="mt-5 max-w-md text-base leading-relaxed text-pretty text-deep/75 md:text-lg"
        >
          {t(
            'Puede que el enlace haya cambiado o que la ola se lo haya llevado. Regresa a tierra firme y sigue con tu antojo de mariscos.',
            'The link may have changed, or a wave carried it away. Head back to dry land and keep that seafood craving going.',
          )}
        </motion.p>

        <motion.div
          variants={staggerItem}
          className="mt-9 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
        >
          <MotionLink
            to="/"
            whileTap={buttonTap}
            transition={{ duration: 0.2, ease: EASE }}
            className={`${PILL} ${GLINT} bg-sunset-deep text-white shadow-[0_8px_24px_-10px_rgb(196_68_30/0.7)] hover:bg-sunset-darker`}
          >
            <span className="relative z-10 flex shrink-0">
              <ArrowLeftIcon className="size-5" />
            </span>
            <span className="relative z-10">{t('Volver al inicio', 'Back to home')}</span>
          </MotionLink>
          <MotionLink
            to="/#menu"
            whileTap={buttonTap}
            transition={{ duration: 0.2, ease: EASE }}
            className={`${PILL} border border-deep/15 bg-white/80 text-deep backdrop-blur-sm hover:bg-white`}
          >
            <span className="relative z-10">{t('Ver el menú', 'See the menu')}</span>
            <span className="relative z-10 flex shrink-0 transition-transform duration-300 group-hover:translate-x-0.5">
              <ArrowRightIcon className="size-5" />
            </span>
          </MotionLink>
        </motion.div>
      </motion.div>

      <WaveBand className="bottom-14 h-16 md:h-20" fill="rgb(28 124 156 / 0.35)" slow />
      <WaveBand className="bottom-6 h-16 md:h-20" fill="#1C7C9C" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-ocean" />
    </main>
  )
}
