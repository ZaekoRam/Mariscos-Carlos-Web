import { motion, useReducedMotion, type Transition } from 'motion/react'
import { useState } from 'react'
import logo from '../assets/logo.svg'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { EASE } from '../lib/motion'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, PhoneIcon } from './icons'
import TypingMessages from './TypingMessages'

/** Flotación suave: ±6 px en un ciclo de 6 s (velocidad continua al repetir). */
const FLOAT_TRANSITION: Transition = {
  duration: 6,
  times: [0, 0.25, 0.75, 1],
  ease: ['easeOut', 'easeInOut', 'easeIn'],
  repeat: Infinity,
}

/** Regreso suave al reposo cuando la flotación se detiene (fuera de pantalla). */
const SETTLE_TRANSITION: Transition = { duration: 0.4, ease: EASE }

const WA_HEADER = 'bg-[#0B5E55]'

function StatusBar() {
  return (
    <div className={`flex h-6 shrink-0 items-center justify-between px-5 pt-1 text-[9px] font-semibold text-white ${WA_HEADER}`}>
      <span className="tabular-nums">12:00</span>
      <span className="flex items-center gap-1">
        <span className="flex items-end gap-[1.5px]">
          <span className="h-[3px] w-[2px] rounded-[1px] bg-white" />
          <span className="h-[5px] w-[2px] rounded-[1px] bg-white" />
          <span className="h-[7px] w-[2px] rounded-[1px] bg-white" />
          <span className="h-[9px] w-[2px] rounded-[1px] bg-white/50" />
        </span>
        <span className="relative ml-0.5 h-[8px] w-[15px] rounded-[2.5px] border border-white/80 p-[1px]">
          <span className="block h-full w-[70%] rounded-[1px] bg-white" />
          <span className="absolute top-1/2 -right-[3px] h-[3px] w-[1.5px] -translate-y-1/2 rounded-r-sm bg-white/80" />
        </span>
      </span>
    </div>
  )
}

function ChatHeader() {
  const { t } = useLang()
  return (
    <div className={`flex shrink-0 items-center gap-2 px-2.5 pt-1 pb-2 text-white ${WA_HEADER}`}>
      <ArrowLeftIcon className="size-3.5 shrink-0" />
      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-foam ring-1 ring-white/30">
        <img src={logo} alt="" className="size-6" width={24} height={24} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[11px] font-semibold sm:text-[12px]">{SITE.nombre}</span>
        <span className="block text-[9px] text-white/80 sm:text-[10px]">{t('en línea', 'online')}</span>
      </span>
      <PhoneIcon className="size-3.5 shrink-0 text-white/90" />
    </div>
  )
}

function Ticks() {
  return (
    <span className="relative inline-flex h-2.5 w-3.5 text-[#34B7F1]">
      <CheckIcon className="absolute left-0 size-2.5" strokeWidth={3} />
      <CheckIcon className="absolute left-1 size-2.5" strokeWidth={3} />
    </span>
  )
}

/**
 * Teléfono plateado (sin notch) con un chat estilo WhatsApp; los mensajes se escriben
 * solos con <TypingMessages />. Flota suavemente sobre la arena con una sombra de contacto.
 * Es decorativo: el dibujo va con aria-hidden y una frase sr-only describe la conversación.
 */
export default function PhoneMockup({ className = '', active = true }: { className?: string; active?: boolean }) {
  const { t } = useLang()
  const reduce = useReducedMotion() ?? false
  // La flotación sólo corre con el hero a la vista (y sin movimiento reducido).
  const floating = !reduce && active
  const [index, setIndex] = useState(0)
  // Mensajes pares: el cliente (burbuja verde, derecha). Impares: el restaurante (blanca, izquierda).
  const fromCustomer = index % 2 === 0

  return (
    <div className={`relative ${className}`}>
      <p className="sr-only">
        {t(
          `Ejemplo de conversación por WhatsApp con ${SITE.nombre}: un cliente pregunta si tienen mesa para 4 y le responden que lo esperan hoy; después pide 5 aguachiles y le avisan que su pedido ya está listo.`,
          `Sample WhatsApp chat with ${SITE.nombre}: a customer asks if there’s a table for 4 and is told they’re expected today; then they order 5 aguachiles and are told their order is ready.`,
        )}
      </p>

      <div aria-hidden="true" className="relative">
        {/* Sombra de contacto sobre la arena: se encoge cuando el teléfono sube. */}
        <motion.div
          className="pointer-events-none absolute right-[8%] -bottom-6 left-[8%] h-8 rounded-[50%] bg-deep/35 blur-xl"
          animate={floating ? { scaleX: [1, 0.88, 1.06, 1], opacity: [0.85, 0.6, 1, 0.85] } : { scaleX: 1, opacity: 0.85 }}
          transition={floating ? FLOAT_TRANSITION : SETTLE_TRANSITION}
        />
        <div className="pointer-events-none absolute right-[22%] -bottom-3 left-[22%] h-3 rounded-[50%] bg-deep/30 blur-md" />

        <motion.div
          animate={floating ? { y: [0, -6, 6, 0] } : { y: 0 }}
          transition={floating ? FLOAT_TRANSITION : SETTLE_TRANSITION}
          className="relative"
        >
          {/* Botones laterales */}
          <span className="absolute top-[20%] -left-[3px] h-8 w-[3px] rounded-l-sm bg-linear-to-b from-[#E4E7EB] to-[#B9C0C8]" />
          <span className="absolute top-[29%] -left-[3px] h-12 w-[3px] rounded-l-sm bg-linear-to-b from-[#E4E7EB] to-[#B9C0C8]" />
          <span className="absolute top-[24%] -right-[3px] h-16 w-[3px] rounded-r-sm bg-linear-to-b from-[#E4E7EB] to-[#B9C0C8]" />

          {/* Marco plateado */}
          <div className="relative aspect-[9/18.5] w-[220px] rounded-[2.6rem] bg-linear-to-br from-[#FBFCFD] via-[#D3D8DE] to-[#F1F3F6] p-[5px] shadow-[0_44px_60px_-34px_rgb(19_50_74/0.6),0_20px_32px_-22px_rgb(19_50_74/0.4),inset_0_1px_1px_rgb(255_255_255/0.9)] ring-1 ring-[#8E98A3]/40 sm:w-[250px] md:w-[270px]">
            {/* Bisel oscuro */}
            <div className="h-full rounded-[2.3rem] bg-[#16191D] p-[3px]">
              {/* Pantalla */}
              <div className="relative flex h-full flex-col overflow-hidden rounded-[2.1rem] bg-[#EFE5D3]">
                <StatusBar />
                <ChatHeader />

                {/* Conversación con fondo beige estilo WhatsApp */}
                <div className="relative flex-1 bg-[radial-gradient(rgb(19_50_74/0.07)_1px,transparent_1.4px)] bg-size-[13px_13px]">
                  <div className="flex flex-col gap-1.5 px-2.5 pt-3">
                    <span className="self-center rounded-md bg-white/85 px-2 py-0.5 text-[8px] font-medium tracking-wide text-deep/75 uppercase shadow-sm sm:text-[9px]">
                      {t('Hoy', 'Today')}
                    </span>
                    <div className="max-w-[80%] self-start rounded-xl rounded-tl-sm bg-white px-2.5 py-1.5 text-[10px] leading-snug text-ink shadow-[0_1px_1px_rgb(0_0_0/0.08)] sm:text-[11px]">
                      {t(`¡Hola! Bienvenido a ${SITE.nombre}. ¿En qué te ayudamos?`, `Hi! Welcome to ${SITE.nombre}. How can we help?`)}
                      <span className="mt-0.5 block text-right text-[8px] text-deep/70">12:01</span>
                    </div>
                    <div className="max-w-[80%] self-end rounded-xl rounded-tr-sm bg-[#D9FDD3] px-2.5 py-1.5 text-[10px] leading-snug text-ink shadow-[0_1px_1px_rgb(0_0_0/0.08)] sm:text-[11px]">
                      {t('Buenas tardes', 'Good afternoon')}
                      <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[8px] text-deep/70">
                        12:02 <Ticks />
                      </span>
                    </div>
                  </div>

                  {/* Burbuja donde se escriben los mensajes (crece hacia arriba). */}
                  <div
                    className={`absolute inset-x-2.5 bottom-3 z-30 flex ${fromCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <motion.div
                      layout="position"
                      initial={false}
                      animate={{ backgroundColor: fromCustomer ? '#D9FDD3' : '#FFFFFF' }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className={`w-[118px] px-2.5 py-2 shadow-[0_1px_1px_rgb(0_0_0/0.08)] sm:w-[140px] md:w-[150px] ${
                        fromCustomer ? 'rounded-xl rounded-br-sm' : 'rounded-xl rounded-bl-sm'
                      }`}
                    >
                      <TypingMessages onMessageChange={setIndex} />
                    </motion.div>
                  </div>
                </div>

                {/* Barra para escribir */}
                <div className="flex shrink-0 items-center gap-1.5 px-2 pt-1 pb-2">
                  <span className="flex h-7 flex-1 items-center rounded-full bg-white px-3 text-[9px] text-deep/70 shadow-[0_1px_1px_rgb(0_0_0/0.06)] sm:text-[10px]">
                    {t('Mensaje', 'Message')}
                  </span>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0B8F74] text-white">
                    <ArrowRightIcon className="size-3.5" />
                  </span>
                </div>
                <span className="mx-auto mb-1.5 block h-1 w-16 shrink-0 rounded-full bg-deep/30" />

                {/* Reflejo del cristal */}
                <span className="pointer-events-none absolute inset-0 rounded-[2.1rem] bg-linear-to-br from-white/20 via-transparent via-40% to-transparent" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
