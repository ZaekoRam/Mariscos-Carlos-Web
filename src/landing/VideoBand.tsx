import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useLang } from '../i18n/lang'
import { VIDEOS } from './media'
import { BgVideo } from './primitives'

/**
 * Transición hacia "el local": la palabra MANZANILLO gigante está rellena con el video de las olas
 * (máscara con mix-blend). Al hacer scroll, el texto se acerca hasta que el video llena la pantalla
 * y aparece "Del mar a tu mesa".
 */
export default function VideoBand() {
  const { t } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const textScale = useTransform(scrollYProgress, [0, 0.5], [1, 7])
  const maskOpacity = useTransform(scrollYProgress, [0.3, 0.48], [1, 0])
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.15, 1])
  const titleOpacity = useTransform(scrollYProgress, [0.45, 0.62, 0.95, 1], [0, 1, 1, 0.7])
  const titleY = useTransform(scrollYProgress, [0.45, 1], ['20%', '-10%'])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.12], [1, 0])

  const title = (
    <p className="font-display text-[clamp(3rem,10vw,9.5rem)] leading-[0.86] tracking-[-0.03em] text-foam drop-shadow-[0_10px_40px_rgb(0_0_0/0.45)]">
      {t('Del mar', 'From the sea')}
      <br />
      <em className="text-gold">{t('a tu mesa', 'to your table')}</em>
    </p>
  )

  if (reduce) {
    return (
      <div className="relative h-[80vh] overflow-hidden bg-night" aria-hidden="true">
        <BgVideo video={VIDEOS.shore} />
        <div className="absolute inset-0 grid place-items-center bg-night/35 px-6 text-center">{title}</div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative h-[180vh] bg-night sm:h-[210vh]" aria-hidden="true">
      <div className="sticky top-0 isolate h-screen overflow-hidden">
        <motion.div className="absolute inset-0" style={{ scale: videoScale }}>
          <BgVideo video={VIDEOS.shore} />
        </motion.div>

        {/* Máscara: fondo noche con el texto en blanco + multiply = el video sólo se ve dentro de las letras */}
        <motion.div className="absolute inset-0 grid place-items-center bg-night mix-blend-multiply" style={{ opacity: maskOpacity }}>
          <motion.p
            className="font-banner text-[18vw] leading-none font-semibold tracking-[-0.02em] whitespace-nowrap text-white uppercase sm:text-[21vw]"
            style={{ scale: textScale, transformOrigin: '50.5% 52%', willChange: 'transform' }}
          >
            Manzanillo
          </motion.p>
        </motion.div>

        <motion.p
          className="absolute inset-x-0 bottom-10 text-center text-[11px] font-semibold tracking-[0.35em] text-foam/75 uppercase max-md:bottom-[calc(6.5rem_+_env(safe-area-inset-bottom))] max-md:supports-[height:1svh]:bottom-[calc(100lvh_-_100svh_+_6.5rem_+_env(safe-area-inset-bottom))]"
          style={{ opacity: hintOpacity }}
        >
          {t('Sigue bajando', 'Keep scrolling')} ↓
        </motion.p>

        <motion.div className="absolute inset-0 grid place-items-center bg-night/20 px-6 text-center" style={{ opacity: titleOpacity }}>
          <motion.div style={{ y: titleY }}>
            <p className="mb-6 text-[11px] font-semibold tracking-[0.35em] text-gold uppercase">Manzanillo · Colima</p>
            {title}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
