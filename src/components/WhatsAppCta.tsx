import type { MouseEvent } from 'react'
import { useLang } from '../i18n/lang'
import { useCart } from '../store/cart'
import { GENERIC_ORDER_MESSAGE, whatsappUrl } from '../lib/whatsapp'
import { CtaButton, type CtaSize, type CtaVariant } from './CtaButton'
import { WhatsAppIcon } from './icons'

/**
 * "Pedir por WhatsApp".
 * - Carrito vacío: abre WhatsApp con un saludo genérico (enlace normal, pestaña nueva).
 * - Carrito con platillos: abre el panel del carrito para enviar el pedido completo.
 */
export function WhatsAppCta({
  label,
  variant = 'sunset',
  size = 'md',
  className,
  onNavigate,
}: {
  label?: string
  variant?: CtaVariant
  size?: CtaSize
  className?: string
  /** Se llama después del clic (por ejemplo, para cerrar el menú móvil). */
  onNavigate?: () => void
}) {
  const { count, openCart } = useCart()
  const { t } = useLang()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (count > 0) {
      event.preventDefault()
      openCart()
    }
    onNavigate?.()
  }

  return (
    <CtaButton
      href={whatsappUrl(GENERIC_ORDER_MESSAGE)}
      external
      onClick={handleClick}
      variant={variant}
      size={size}
      className={className}
      icon={<WhatsAppIcon className={size === 'lg' ? 'size-6' : 'size-5'} />}
    >
      {label ?? t('Pedir por WhatsApp', 'Order on WhatsApp')}
    </CtaButton>
  )
}
