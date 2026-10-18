import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { EASE, fadeUp, REVEAL_VIEWPORT } from '../lib/motion'

/**
 * Sección de la página: <section> semántica con aria-labelledby, espaciado del sitio
 * (py-16 en móvil, py-24 en escritorio), márgenes laterales de 16 px y contenedor max-w-6xl.
 * El encabezado fijo se compensa con scroll-mt (altura real publicada por <Navbar /> en --header-h).
 */
export function Section({
  id,
  labelledBy,
  className = '',
  containerClassName = '',
  children,
}: {
  id: string
  /** id del h2 que nombra la sección. */
  labelledBy: string
  className?: string
  containerClassName?: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`relative scroll-mt-[calc(var(--header-h,5.5rem)_+_0.75rem)] px-4 py-16 sm:px-6 md:py-24 ${className}`}>
      <div className={`mx-auto w-full max-w-6xl ${containerClassName}`}>{children}</div>
    </section>
  )
}

/**
 * Aparición al hacer scroll (opacidad 0 → 1, y 24 → 0), una sola vez, al 20 % visible.
 * Úsalo en bloques de contenido (encabezados, tarjetas, formularios), no en secciones
 * muy altas completas: un bloque más alto que 5 pantallas nunca llegaría al 20 % visible.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const variants = delay
    ? { hidden: fadeUp.hidden, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay } } }
    : fadeUp
  return (
    <motion.div className={className} variants={variants} initial="hidden" whileInView="visible" viewport={REVEAL_VIEWPORT}>
      {children}
    </motion.div>
  )
}

/** Encabezado de sección: antetítulo, título (h2 con id) y descripción. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'light',
}: {
  /** id del h2 (el mismo que `labelledBy` de la sección). */
  id: string
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  align?: 'left' | 'center'
  /** "dark" cuando la sección tiene fondo azul profundo. */
  tone?: 'light' | 'dark'
}) {
  const centered = align === 'center'
  const dark = tone === 'dark'
  return (
    <Reveal className={`mb-10 md:mb-14 ${centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}`}>
      {eyebrow ? (
        <p
          className={`mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase ${
            dark ? 'text-gold' : 'text-ocean-deep'
          }`}
        >
          <span aria-hidden="true" className={`h-px w-6 ${dark ? 'bg-gold' : 'bg-ocean-deep'}`} />
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className={`font-display text-[32px] leading-[1.02] tracking-tight text-balance md:text-5xl ${dark ? 'text-foam' : 'text-deep'}`}
      >
        {title}
      </h2>
      {description ? (
        <div className={`mt-4 text-base leading-relaxed text-pretty md:text-lg ${dark ? 'text-foam/80' : 'text-deep/75'}`}>
          {description}
        </div>
      ) : null}
    </Reveal>
  )
}
