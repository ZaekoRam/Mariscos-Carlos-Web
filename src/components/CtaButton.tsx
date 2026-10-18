import { motion } from 'motion/react'
import type { MouseEventHandler, ReactNode } from 'react'
import { buttonTap } from '../lib/motion'

/**
 * Botón / enlace de llamada a la acción con el brillo superior ("glint")
 * que se ensancha al pasar el cursor.
 *
 * Variante "sunset": fondo naranja atardecer (#C4441E, versión AA del --color-sunset
 * para texto blanco de tamaño normal; #E8552B con texto blanco sólo llega a 3.6:1).
 */
export type CtaVariant = 'sunset' | 'ocean' | 'deep' | 'light' | 'outline'
export type CtaSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<CtaVariant, string> = {
  sunset: 'bg-sunset-deep text-white shadow-[0_8px_24px_-10px_rgb(196_68_30/0.7)] hover:bg-sunset-darker',
  ocean: 'bg-ocean text-white shadow-[0_8px_24px_-12px_rgb(28_124_156/0.7)] hover:bg-ocean-deep',
  deep: 'bg-deep text-white shadow-[0_8px_24px_-12px_rgb(19_50_74/0.7)] hover:bg-deep/90',
  light: 'bg-white/80 text-deep border border-deep/15 backdrop-blur-sm hover:bg-white',
  outline: 'bg-transparent text-deep border border-deep/25 hover:bg-deep/5',
}

const SIZES: Record<CtaSize, string> = {
  sm: 'h-10 px-4 text-sm gap-2',
  md: 'h-12 px-6 text-[15px] gap-2.5',
  lg: 'h-14 px-7 text-base gap-3',
}

const GLINT =
  "before:pointer-events-none before:absolute before:left-[10%] before:top-px before:h-4 before:w-[80%] before:rounded-xl before:bg-linear-to-b before:from-white/40 before:to-transparent before:content-[''] before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.16,1,0.3,1)] hover:before:scale-x-[1.18]"

function classes(variant: CtaVariant, size: CtaSize, className?: string) {
  const glint = variant === 'light' || variant === 'outline' ? '' : GLINT
  return [
    'group relative isolate inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold whitespace-nowrap select-none transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    glint,
    className ?? '',
  ].join(' ')
}

interface CommonProps {
  children: ReactNode
  variant?: CtaVariant
  size?: CtaSize
  /** Ícono a la izquierda del texto. */
  icon?: ReactNode
  /** Ícono a la derecha del texto. */
  iconRight?: ReactNode
  className?: string
  'aria-label'?: string
}

interface LinkProps extends CommonProps {
  href: string
  /** Abre en pestaña nueva (WhatsApp, Google Maps, redes). */
  external?: boolean
  onClick?: MouseEventHandler<HTMLAnchorElement>
  download?: string
}

interface ButtonProps extends CommonProps {
  href?: undefined
  onClick?: MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function CtaButton(props: LinkProps | ButtonProps) {
  const { children, variant = 'sunset', size = 'md', icon, iconRight, className } = props
  const content = (
    <>
      {icon ? <span className="relative z-10 flex shrink-0">{icon}</span> : null}
      <span className="relative z-10">{children}</span>
      {iconRight ? <span className="relative z-10 flex shrink-0">{iconRight}</span> : null}
    </>
  )

  if (props.href !== undefined) {
    return (
      <motion.a
        href={props.href}
        onClick={props.onClick}
        target={props.external ? '_blank' : undefined}
        rel={props.external ? 'noopener noreferrer' : undefined}
        download={props.download}
        aria-label={props['aria-label']}
        whileTap={buttonTap}
        className={classes(variant, size, className)}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
      aria-label={props['aria-label']}
      whileTap={props.disabled ? undefined : buttonTap}
      className={classes(variant, size, className)}
    >
      {content}
    </motion.button>
  )
}
