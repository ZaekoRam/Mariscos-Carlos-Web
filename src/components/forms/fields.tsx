import type { ReactNode } from 'react'
import { useLang } from '../../i18n/lang'
import { InfoIcon } from '../icons'

/**
 * Piezas compartidas de formularios claros (reservaciones, ficha de pago).
 * Los errores usan sunset-darker (#A9391A), que cumple AA sobre blanco y espuma.
 */

/** Clases de input / select / textarea. */
export function controlClass(invalid: boolean, extra = ''): string {
  return [
    'block w-full min-h-12 rounded-2xl border bg-white px-4 py-3 text-base text-deep shadow-[inset_0_1px_2px_rgb(19_50_74/0.06)] transition-colors duration-200',
    'placeholder:text-deep/70 hover:border-deep/35 disabled:cursor-not-allowed disabled:opacity-60',
    invalid ? 'border-sunset-darker bg-sunset/5' : 'border-deep/20',
    extra,
  ].join(' ')
}

export function FieldLabel({
  htmlFor,
  children,
  optional,
  id,
}: {
  htmlFor?: string
  children: ReactNode
  optional?: boolean
  id?: string
}) {
  const { t } = useLang()
  return (
    <label id={id} htmlFor={htmlFor} className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold text-deep">
      <span>{children}</span>
      {optional ? <span className="text-xs font-normal text-deep/70">{t('Opcional', 'Optional')}</span> : null}
    </label>
  )
}

/** Mensaje de error de un campo. Si `live`, se anuncia en cuanto aparece. */
export function FieldError({ id, message, live = false }: { id: string; message?: string; live?: boolean }) {
  return (
    <div id={id} aria-live={live ? 'polite' : undefined}>
      {message ? (
        <p className="mt-2 flex items-start gap-1.5 text-sm font-medium text-sunset-darker">
          <InfoIcon className="mt-px size-4 shrink-0" />
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  )
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 text-xs leading-relaxed text-deep/70">
      {children}
    </p>
  )
}

/** Une ids para aria-describedby, omitiendo los vacíos. */
export function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const joined = ids.filter(Boolean).join(' ')
  return joined || undefined
}
