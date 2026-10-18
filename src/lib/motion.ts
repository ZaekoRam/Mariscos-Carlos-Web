import type { Transition, Variants } from 'motion/react'

/** Curva de animación por defecto del sitio. */
export const EASE = [0.16, 1, 0.3, 1] as const

export const DEFAULT_TRANSITION: Transition = { duration: 0.8, ease: EASE }

/** Aparición al hacer scroll: opacidad 0 → 1, y 24 → 0, una sola vez. */
export const REVEAL_VIEWPORT = { once: true, amount: 0.2 } as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: DEFAULT_TRANSITION },
}

/** Contenedor que escalona a sus hijos. */
export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  }
}

/** Hijo de un contenedor escalonado: opacidad 0 → 1, y 12 → 0. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

/** Elevación al pasar el cursor sobre tarjetas. */
export const cardHover = { y: -4 } as const

/** Presión de botones. */
export const buttonTap = { scale: 0.97 } as const
