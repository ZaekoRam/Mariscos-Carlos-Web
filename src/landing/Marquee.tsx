import { motion, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from 'motion/react'

const DISHES = [
  'Aguachile',
  'Pulpo zarandeado',
  'Coctel campechano',
  'Camarones al coco',
  'Huachinango',
  'Ceviche',
  'Tostadas',
  'Molcajete de mariscos',
  'Caldillo de camarón',
  'Filete relleno',
]

function Row({ reverse = false, outline = false }: { reverse?: boolean; outline?: boolean }) {
  const words = [...DISHES, ...DISHES]
  return (
    <div className="flex overflow-x-clip">
      <div
        className={`flex shrink-0 animate-marquee items-center gap-7 pr-7 whitespace-nowrap md:gap-10 md:pr-10 ${reverse ? '[animation-direction:reverse]' : ''}`}
      >
        {words.map((word, i) => (
          <span key={i} className="flex items-center gap-7 md:gap-10">
            <span className={`font-display text-[clamp(2.125rem,7vw,6.5rem)] leading-none tracking-tight ${outline ? 'text-outline text-deep/70 italic' : 'text-deep'}`}>
              {word}
            </span>
            <span aria-hidden="true" className="text-2xl text-sunset md:text-3xl">✺</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Franja con nombres de platillos que corre en dos direcciones y se inclina con la velocidad del scroll. */
export default function Marquee() {
  const reduce = useReducedMotion() ?? false
  const { scrollY } = useScroll()
  const velocity = useVelocity(scrollY)
  const smooth = useSpring(velocity, { damping: 50, stiffness: 300 })
  const skew = useTransform(smooth, [-2500, 0, 2500], [6, 0, -6], { clamp: true })

  return (
    <div aria-hidden="true" className="relative overflow-hidden border-y border-deep/10 bg-shell py-8 md:py-14">
      <motion.div className="flex flex-col gap-3 md:gap-6" style={reduce ? undefined : { skewX: skew }}>
        <Row />
        <Row reverse outline />
      </motion.div>
    </div>
  )
}
