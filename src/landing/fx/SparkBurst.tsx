import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const RAYS = 8

/**
 * Chispas doradas que salen de un botón (por ejemplo al tocar "+").
 * Uso: dentro de un botón con `relative`, <SparkBurst trigger={contador} />.
 * Cada vez que `trigger` cambia (y es > 0) dispara una ráfaga corta. Sin canvas ni bucles:
 * 8 rayitas con transform/opacity que se desmontan solas.
 */
export default function SparkBurst({ trigger, color = '#F2B134', radius = 26 }: { trigger: number; color?: string; radius?: number }) {
  const reduce = useReducedMotion() ?? false
  if (reduce) return null
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center overflow-visible">
      <AnimatePresence>
        {trigger > 0 ? (
          <motion.span key={trigger} className="absolute inset-0 grid place-items-center" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.55, delay: 0.15 }}>
            {Array.from({ length: RAYS }, (_, i) => {
              const angle = (i / RAYS) * 360
              return (
                <span key={i} className="absolute" style={{ transform: `rotate(${angle}deg)` }}>
                  <motion.span
                    className="block h-[3px] w-2.5 rounded-full"
                    style={{ backgroundColor: color, originX: 0 }}
                    initial={{ x: radius * 0.45, scaleX: 0.4, opacity: 1 }}
                    animate={{ x: radius, scaleX: 1, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </span>
              )
            })}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}
