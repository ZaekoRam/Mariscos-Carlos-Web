import { useInView, useReducedMotion } from 'motion/react'
import { Fragment, useEffect, useId, useRef } from 'react'

/**
 * Texto en círculo que gira lento (inspirado en "Circular Text" de React Bits).
 *
 * - El giro es una animación del navegador (Web Animations, sólo `transform`), así corre en el
 *   compositor: no hay bucle de JavaScript.
 * - Se pausa cuando sale de pantalla y acelera con `boost` (hover, sticker activo) sin saltos,
 *   porque sólo cambia la velocidad de reproducción.
 * - Con movimiento reducido queda fijo.
 * - Las letras se reparten a lo largo de toda la circunferencia (textLength), así el espaciado
 *   queda parejo sin importar el idioma.
 *
 * Es decorativo (aria-hidden): quien lo use debe dar el mismo texto de otra forma si importa.
 */
export default function CircularText({
  text,
  className = '',
  separatorClassName = 'fill-sunset',
  duration = 42,
  boost = false,
  boostRate = 4,
  radius = 77,
  fontSize = 12,
  fontWeight = 600,
}: {
  /** Texto a repetir en el anillo; los "•" se pintan con `separatorClassName`. */
  text: string
  className?: string
  separatorClassName?: string
  /** Segundos por vuelta a velocidad normal. */
  duration?: number
  boost?: boolean
  boostRate?: number
  /** Radio de la línea base, en unidades de un viewBox de 200 × 200. */
  radius?: number
  fontSize?: number
  fontWeight?: number
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const spinRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<Animation | null>(null)
  const reduce = useReducedMotion() ?? false
  const inView = useInView(wrapRef, { margin: '80px 0px 80px 0px' })
  const pathId = `ct-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  // Crea la animación (en pausa); se recrea sólo si cambia la duración o la preferencia de movimiento.
  useEffect(() => {
    const el = spinRef.current
    if (!el || reduce || typeof el.animate !== 'function') return
    const anim = el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: duration * 1000,
      iterations: Infinity,
      easing: 'linear',
    })
    anim.pause()
    animRef.current = anim
    return () => {
      anim.cancel()
      animRef.current = null
    }
  }, [duration, reduce])

  // Sólo gira mientras está a la vista.
  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (inView) anim.play()
    else anim.pause()
  }, [inView, duration, reduce])

  // Acelera sin brincar: se cambia la velocidad, no la posición.
  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    const rate = boost ? boostRate : 1
    if (typeof anim.updatePlaybackRate === 'function') anim.updatePlaybackRate(rate)
    else anim.playbackRate = rate
  }, [boost, boostRate, duration, reduce])

  const circumference = 2 * Math.PI * radius
  const parts = text.split('•')

  return (
    <div ref={wrapRef} aria-hidden="true" className={`pointer-events-none select-none ${className}`}>
      <div ref={spinRef} className="size-full">
        <svg viewBox="0 0 200 200" className="block size-full overflow-visible" focusable="false">
          <defs>
            <path
              id={pathId}
              d={`M 100 ${100 - radius} a ${radius} ${radius} 0 1 1 0 ${radius * 2} a ${radius} ${radius} 0 1 1 0 ${-radius * 2}`}
            />
          </defs>
          <text className="fill-current font-banner" fontSize={fontSize} fontWeight={fontWeight} style={{ whiteSpace: 'pre' }}>
            <textPath href={`#${pathId}`} textLength={circumference} lengthAdjust="spacing">
              {parts.map((part, i) => (
                <Fragment key={i}>
                  {part}
                  {i < parts.length - 1 ? <tspan className={separatorClassName}>•</tspan> : null}
                </Fragment>
              ))}
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  )
}
