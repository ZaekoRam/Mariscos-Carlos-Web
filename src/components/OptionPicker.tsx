import { useId } from 'react'
import { useMenuText } from '../i18n/menuText'
import { formatMXN, type MenuItem, type Selection } from '../lib/menu'

/**
 * Selector de opciones de un platillo (se usa en el menú y en el demo de mesero).
 * - Grupos de hasta 6 valores: chips de radio (accesibles con teclado).
 * - Grupos más grandes (marcas de cerveza, refrescos): <select>.
 */
export function OptionPicker({
  item,
  selection,
  onChange,
  size = 'md',
  tone = 'light',
}: {
  item: MenuItem
  selection: Selection
  onChange: (next: Selection) => void
  size?: 'sm' | 'md'
  tone?: 'light' | 'dark'
}) {
  const baseId = useId()
  const mt = useMenuText()
  const groups = item.opciones ?? []
  if (groups.length === 0) return null

  // Altura mínima de 40 px: objetivo táctil cómodo aunque el texto sea pequeño.
  const chip = size === 'sm' ? 'inline-flex min-h-10 items-center px-3 text-xs' : 'inline-flex min-h-10 items-center px-3.5 text-[13px]'
  const dark = tone === 'dark'

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, groupIndex) => {
        const groupId = `${baseId}-g${groupIndex}`
        const current = selection[group.nombre] ?? group.valores[0]
        const label = (value: string) => {
          const extra = group.extra?.[value]
          return extra ? `${mt.value(value)} (+${formatMXN(extra)})` : mt.value(value)
        }

        if (group.valores.length > 6) {
          return (
            <div key={group.nombre} className="flex flex-col gap-1.5">
              <label
                htmlFor={groupId}
                className={`text-[11px] font-semibold tracking-[0.14em] uppercase ${dark ? 'text-foam/75' : 'text-deep/70'}`}
              >
                {mt.group(group.nombre)}
              </label>
              <select
                id={groupId}
                value={current}
                onChange={(e) => onChange({ ...selection, [group.nombre]: e.target.value })}
                className={`w-full rounded-xl border px-3 py-2 text-sm ${
                  dark ? 'border-white/15 bg-white/10 text-foam' : 'border-deep/15 bg-white text-deep'
                }`}
              >
                {group.valores.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </div>
          )
        }

        return (
          <fieldset key={group.nombre} className="flex min-w-0 flex-col gap-1.5">
            <legend
              className={`mb-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase ${dark ? 'text-foam/75' : 'text-deep/70'}`}
            >
              {mt.group(group.nombre)}
            </legend>
            <div className="flex flex-wrap gap-2">
              {group.valores.map((value) => {
                const checked = current === value
                return (
                  <label
                    key={value}
                    className={`relative cursor-pointer rounded-full border font-medium transition-colors has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-sunset has-[:focus-visible]:outline-solid ${chip} ${
                      checked
                        ? dark
                          ? 'border-gold bg-gold text-deep'
                          : 'border-deep bg-deep text-white'
                        : dark
                          ? 'border-white/20 bg-white/5 text-foam hover:border-white/40'
                          : 'border-deep/15 bg-white/80 text-deep hover:border-deep/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name={groupId}
                      value={value}
                      checked={checked}
                      onChange={() => onChange({ ...selection, [group.nombre]: value })}
                      className="sr-only"
                    />
                    {label(value)}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}
