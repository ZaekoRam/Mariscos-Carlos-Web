import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { SITE } from '../../config/site'
import { useLang } from '../../i18n/lang'
import { EASE } from '../../lib/motion'
import { BagIcon, TableIcon, UsersIcon } from '../icons'

export type ModeChoice = 'local' | 'llevar' | 'mesa'

interface OptionDef {
  value: ModeChoice
  label: string
  hint: string
  icon: ReactNode
}

/**
 * Cómo se entrega el pedido: consumo en el lugar, para llevar (retiro) o mesa.
 * Radios nativos dentro de tarjetas segmentadas (fieldset + legend).
 */
export default function OrderModePicker({
  value,
  onChange,
  mesaParam,
  mesaManual,
  onMesaManualChange,
  mesaError,
  mesaSelectId,
}: {
  value: ModeChoice
  onChange: (value: ModeChoice) => void
  /** Mesa detectada por ?mesa=N (QR). */
  mesaParam: number | null
  /** Número elegido a mano cuando no hay mesa en la URL ('' = sin elegir). */
  mesaManual: string
  onMesaManualChange: (value: string) => void
  mesaError: string | null
  mesaSelectId: string
}) {
  const { t } = useLang()
  const reduceMotion = useReducedMotion()
  const options: OptionDef[] = [
    { value: 'local', label: t('En el lugar', 'Dine in'), hint: t('Consumo en el lugar', 'Eat at the restaurant'), icon: <UsersIcon className="size-5" /> },
    { value: 'llevar', label: t('Para llevar', 'To go'), hint: t('Retiro en el negocio', 'Pick up at the restaurant'), icon: <BagIcon className="size-5" /> },
    {
      value: 'mesa',
      label: mesaParam ? t(`Mesa ${mesaParam}`, `Table ${mesaParam}`) : t('En mi mesa', 'At my table'),
      hint: mesaParam ? t('Desde el QR', 'From the QR code') : t('Elige el número', 'Choose the number'),
      icon: <TableIcon className="size-5" />,
    },
  ]
  const errorId = `${mesaSelectId}-error`
  const showManual = value === 'mesa' && !mesaParam

  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-deep">{t('¿Cómo lo quieres?', 'How would you like it?')}</legend>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-2">
        {options.map((opt) => {
          const checked = value === opt.value
          return (
            <label
              key={opt.value}
              className={`relative flex min-h-[5.5rem] cursor-pointer flex-col items-start justify-between gap-2 rounded-2xl border p-3 transition-colors duration-200 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sunset has-[:focus-visible]:outline-solid ${
                checked
                  ? 'border-ocean-deep bg-ocean-deep text-white shadow-[0_12px_24px_-16px_rgb(22_101_127/0.9)]'
                  : 'border-deep/15 bg-white/80 text-deep hover:border-deep/30 hover:bg-white'
              }`}
            >
              <input
                type="radio"
                name="modo-pedido"
                value={opt.value}
                checked={checked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              <span aria-hidden="true" className={checked ? 'text-gold' : 'text-ocean-deep'}>
                {opt.icon}
              </span>
              <span className="flex flex-col">
                <span className="text-sm leading-tight font-semibold">{opt.label}</span>
                <span className={`mt-0.5 text-[11px] leading-tight ${checked ? 'text-white/85' : 'text-deep/75'}`}>{opt.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <AnimatePresence initial={false}>
        {showManual ? (
          <motion.div
            key="mesa-manual"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={reduceMotion ? { duration: 0.15 } : { duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <label htmlFor={mesaSelectId} className="mb-1.5 block text-sm font-medium text-deep">
                {t('Número de mesa', 'Table number')}
              </label>
              <select
                id={mesaSelectId}
                value={mesaManual}
                onChange={(e) => onMesaManualChange(e.target.value)}
                aria-invalid={mesaError ? true : undefined}
                aria-describedby={mesaError ? errorId : undefined}
                className={`h-11 w-full rounded-xl border bg-white px-3 text-base text-deep ${
                  mesaError ? 'border-sunset-deep' : 'border-deep/20'
                }`}
              >
                <option value="">{t('Elige tu mesa', 'Choose your table')}</option>
                {Array.from({ length: SITE.totalMesas }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={String(n)}>
                    {t('Mesa', 'Table')} {n}
                  </option>
                ))}
              </select>
              {mesaError ? (
                <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-sunset-darker">
                  {mesaError}
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </fieldset>
  )
}
