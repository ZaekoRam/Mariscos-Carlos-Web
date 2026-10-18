import { motion } from 'motion/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  CATEGORIES,
  defaultSelection,
  formatMXN,
  groupBySection,
  hasPriceVariants,
  itemDisplayName,
  matchesSearch,
  MENU,
  priceLabel,
  unitPrice,
  type MenuItem,
  type Selection,
} from '../../lib/menu'
import { buttonTap } from '../../lib/motion'
import { CheckIcon, ClockIcon, CloseIcon, LeafIcon, PlusIcon, SearchIcon } from '../icons'
import { OptionPicker } from '../OptionPicker'
import { EYEBROW, PRIMARY_SMALL, SURFACE, TEXT_MUTED, TEXT_STRONG } from './styles'

/** Fila compacta de un platillo: nombre, porción, precio, opciones y "Agregar". */
function ItemRow({
  item,
  dark,
  onAdd,
}: {
  item: MenuItem
  dark: boolean
  onAdd: (item: MenuItem, selection: Selection) => void
}) {
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item))
  const [addedAt, setAddedAt] = useState(0)

  useEffect(() => {
    if (!addedAt) return
    const id = window.setTimeout(() => setAddedAt(0), 1400)
    return () => window.clearTimeout(id)
  }, [addedAt])

  const price = unitPrice(item, selection)
  const priceText = !item.por_kilo && hasPriceVariants(item) && price !== null ? formatMXN(price) : priceLabel(item)
  const added = addedAt > 0

  return (
    <li className="rounded-2xl border border-deep/10 bg-foam/70 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] leading-snug font-semibold ${TEXT_STRONG}`}>{item.nombre}</p>
          <p className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${TEXT_MUTED}`}>
            {item.porcion ? <span>{item.porcion}</span> : null}
            <span className={`font-semibold tabular-nums ${TEXT_STRONG}`}>{priceText}</span>
            {item.temporada ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/30 px-2 py-0.5 font-semibold text-deep dark:bg-gold dark:text-deep">
                <LeafIcon className="size-3" />
                Temporada
              </span>
            ) : null}
            {item.preparacion_larga ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-ocean-deep/10 px-2 py-0.5 font-semibold text-ocean-deep dark:bg-ocean-deep dark:text-white"
                title={MENU.notas.preparacion_larga}
              >
                <ClockIcon className="size-3" />
                Tarda más
              </span>
            ) : null}
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => {
            onAdd(item, selection)
            setAddedAt(Date.now())
          }}
          whileTap={buttonTap}
          aria-label={`Agregar ${itemDisplayName(item)}`}
          className={
            added
              ? 'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white dark:bg-emerald-400 dark:text-deep'
              : PRIMARY_SMALL
          }
        >
          {added ? <CheckIcon className="size-4" /> : <PlusIcon className="size-4" />}
          {added ? 'Agregado' : 'Agregar'}
        </motion.button>
      </div>
      {item.opciones && item.opciones.length > 0 ? (
        <div className="mt-3">
          <OptionPicker
            item={item}
            selection={selection}
            onChange={setSelection}
            size="sm"
            tone={dark ? 'dark' : 'light'}
          />
        </div>
      ) : null}
    </li>
  )
}

/**
 * Menú para tomar la orden: pestañas por categoría (desplazables en su propio
 * contenedor) y búsqueda en todo el menú.
 */
export default function MenuPicker({
  dark,
  onAdd,
}: {
  dark: boolean
  onAdd: (item: MenuItem, selection: Selection) => void
}) {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const searchId = useId()
  const headingId = useId()
  const topRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const searching = query.trim().length > 0

  const category = CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0]

  const results = useMemo(() => {
    if (!searching) return []
    return CATEGORIES.map((c) => ({ category: c, items: c.items.filter((item) => matchesSearch(item, query)) })).filter(
      (g) => g.items.length > 0,
    )
  }, [query, searching])

  const resultCount = results.reduce((sum, g) => sum + g.items.length, 0)

  const scrollToTop = () => {
    const root = topRef.current?.closest('[data-scroll-root]')
    if (root) root.scrollTop = 0
  }

  const selectCategory = (id: string) => {
    setCategoryId(id)
    setQuery('')
    scrollToTop()
    tabRefs.current.get(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }

  return (
    <div>
      <div ref={topRef} />
      <div
        className={`sticky top-0 z-10 border-b border-deep/10 px-4 pt-4 pb-3 sm:px-5 dark:border-white/10 ${SURFACE}`}
      >
        <h3 id={headingId} className={EYEBROW + ' font-sans'}>
          Menú
        </h3>
        <div className="relative mt-2">
          <label htmlFor={searchId} className="sr-only">
            Buscar platillo en todo el menú
          </label>
          <SearchIcon
            className={`pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 ${TEXT_MUTED}`}
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              scrollToTop()
            }}
            placeholder="Buscar platillo…"
            autoComplete="off"
            className="h-11 w-full rounded-full border border-deep/15 bg-foam pr-11 pl-10 text-[15px] text-deep placeholder:text-deep/70 dark:border-white/15 dark:bg-white/10 dark:text-foam dark:placeholder:text-foam/70 [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Borrar búsqueda"
              className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-deep hover:bg-deep/5 dark:text-foam dark:hover:bg-white/10"
            >
              <CloseIcon className="size-4" />
            </button>
          ) : null}
        </div>
        <div
          role="group"
          aria-label="Categorías del menú"
          className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:-mx-5 sm:px-5"
        >
          {CATEGORIES.map((c) => {
            const active = !searching && c.id === category.id
            return (
              <button
                key={c.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(c.id, el)
                  else tabRefs.current.delete(c.id)
                }}
                type="button"
                aria-pressed={active}
                onClick={() => selectCategory(c.id)}
                className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'border-deep bg-deep text-white dark:border-gold dark:bg-gold dark:text-deep'
                    : 'border-deep/15 bg-white text-deep hover:border-deep/40 dark:border-white/15 dark:bg-white/5 dark:text-foam dark:hover:border-white/40'
                }`}
              >
                {c.nombre}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <p className="sr-only" aria-live="polite">
          {searching ? (resultCount === 1 ? '1 resultado' : `${resultCount} resultados`) : ''}
        </p>

        {searching ? (
          results.length === 0 ? (
            <p className={`rounded-2xl border border-dashed border-deep/20 p-6 text-center text-sm dark:border-white/20 ${TEXT_MUTED}`}>
              No encontramos “{query.trim()}” en el menú.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {results.map(({ category: c, items }) => (
                <div key={c.id}>
                  <h4 className={`mb-2 font-display text-lg ${TEXT_STRONG}`}>{c.nombre}</h4>
                  <ul className="flex flex-col gap-2">
                    {items.map((item) => (
                      <ItemRow key={item.id} item={item} dark={dark} onAdd={onAdd} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-5">
            <div>
              <h4 className={`font-display text-2xl ${TEXT_STRONG}`}>
                {category.nombre}
              </h4>
              {category.notas?.map((nota) => (
                <p key={nota} className={`mt-1 text-xs leading-relaxed ${TEXT_MUTED}`}>
                  {nota}
                </p>
              ))}
            </div>
            {groupBySection(category.items).map((group, index) => (
              <div key={group.seccion ?? `sin-seccion-${index}`}>
                {group.seccion ? (
                  <p className={`mb-2 font-display text-base italic ${TEXT_STRONG}`}>{group.seccion}</p>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {group.items.map((item) => (
                    <ItemRow key={item.id} item={item} dark={dark} onAdd={onAdd} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
