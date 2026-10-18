import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CtaButton } from '../components/CtaButton'
import { InfoIcon, PrinterIcon, QrIcon } from '../components/icons'
import QrCard from '../components/qr/QrCard'
import type { DownloadResult } from '../components/qr/downloadQrCard'
import { Reveal, Section, SectionHeading } from '../components/Section'
import { getPublicBaseUrl, SITE } from '../config/site'
import { EASE, staggerContainer } from '../lib/motion'

type Filter = 'todas' | number

const MESAS = Array.from({ length: SITE.totalMesas }, (_, i) => i + 1)

/** El grid de 12 tarjetas en móvil es muy alto: basta con que asome para animar. */
const GRID_VIEWPORT = { once: true, amount: 0.05 } as const

const STEPS = [
  {
    title: 'Escanea el código de tu mesa',
    text: 'Con la cámara de tu celular. No necesitas descargar ninguna app.',
  },
  {
    title: 'Elige tus platillos',
    text: 'El menú se abre con tu número de mesa ya anotado.',
  },
  {
    title: 'Envía tu pedido',
    text: 'Revisa tu orden en el carrito y mándala cuando estés listo.',
  },
]

export default function QrSection() {
  const [filter, setFilter] = useState<Filter>('todas')
  const [announcement, setAnnouncement] = useState('')

  const baseUrl = useMemo(() => getPublicBaseUrl(), [])
  const shortBase = baseUrl.replace(/^https?:\/\//, '')
  const usingPreviewDomain = !SITE.publicUrl.trim()

  const visibles = filter === 'todas' ? MESAS : [filter]

  const handleDownloaded = useCallback((mesa: number, result: DownloadResult) => {
    if (result === 'png') setAnnouncement(`Tarjeta de la mesa ${mesa} descargada en PNG.`)
    else if (result === 'svg') setAnnouncement(`Código de la mesa ${mesa} descargado en SVG.`)
    else setAnnouncement(`No se pudo descargar la tarjeta de la mesa ${mesa}. Intenta con "Imprimir tarjetas".`)
  }, [])

  function handlePrint() {
    try {
      window.print()
    } catch {
      setAnnouncement('Tu navegador no permitió imprimir. Usa la opción Imprimir del menú del navegador.')
    }
  }

  return (
    <Section id="qr" labelledBy="qr-title" className="overflow-hidden bg-sand">
      {/* Halo cálido decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full bg-gold/20 blur-3xl print:hidden"
      />

      <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16">
        <SectionHeading
          id="qr-title"
          eyebrow="Pedidos en mesa"
          title={
            <>
              Escanea y pide <em className="text-ocean-deep">desde tu mesa</em>
            </>
          }
          description={
            <p>
              Cada mesa tiene su propio código QR. Al escanearlo se abre este menú con el número de mesa listo, para
              que elijas con calma y envíes tu pedido sin esperar.
            </p>
          }
        />

        <Reveal className="mb-10 md:mb-14" delay={0.1}>
          <ol className="relative space-y-4 rounded-3xl border border-deep/10 bg-white/60 p-5 shadow-[0_18px_40px_-24px_rgb(19_50_74/0.45)] sm:p-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-deep font-display text-lg text-gold italic"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold text-deep">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-deep/75">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>

      {/* Herramientas: selector de mesa e impresión (no se imprimen) */}
      <Reveal className="no-print">
        <div className="relative rounded-3xl border border-deep/10 bg-white/70 p-4 shadow-[0_18px_40px_-24px_rgb(19_50_74/0.45)] sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-xl text-deep sm:text-2xl">
                <QrIcon className="size-5 text-ocean-deep" />
                Tarjetas para tus mesas
              </h3>
              <p id="qr-picker-hint" className="mt-1 text-sm text-deep/75">
                Elige una mesa o descarga e imprime todas. Se imprimen las tarjetas que estén a la vista.
              </p>
            </div>
            <CtaButton variant="deep" onClick={handlePrint} icon={<PrinterIcon className="size-5" />} className="self-start md:self-auto">
              Imprimir tarjetas
            </CtaButton>
          </div>

          <LayoutGroup id="qr-filter">
            <div role="group" aria-label="Filtrar tarjetas por mesa" aria-describedby="qr-picker-hint" className="mt-5 flex flex-wrap gap-2">
              <FilterChip active={filter === 'todas'} onClick={() => setFilter('todas')}>
                Todas
              </FilterChip>
              {MESAS.map((mesa) => (
                <FilterChip key={mesa} active={filter === mesa} onClick={() => setFilter(mesa)}>
                  {/* Un solo hijo en línea: dentro del inline-flex, el espacio final de un ítem flex se recortaría ("Mesa1") */}
                  <span>
                    <span className="sr-only sm:not-sr-only">{'Mesa '}</span>
                    {mesa}
                  </span>
                </FilterChip>
              ))}
            </div>
          </LayoutGroup>

          {usingPreviewDomain ? (
            <p className="mt-5 flex items-start gap-2 rounded-2xl bg-gold/20 px-3.5 py-3 text-sm leading-relaxed text-deep">
              <InfoIcon className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0">
                Vista previa: los códigos apuntan a <code className="font-mono break-all">{baseUrl}</code>. Antes de
                imprimir, configura el dominio final en <code className="font-mono break-all">src/config/site.ts</code>.
              </span>
            </p>
          ) : null}
        </div>
      </Reveal>

      <p className="sr-only" aria-live="polite" role="status">
        {announcement}
      </p>

      <div className="print-area mt-8 md:mt-10">
        <AnimatePresence mode="wait">
          <motion.ul
            key={filter === 'todas' ? 'todas' : `mesa-${filter}`}
            aria-label={filter === 'todas' ? 'Tarjetas QR de todas las mesas' : `Tarjeta QR de la mesa ${filter}`}
            variants={staggerContainer(0.05)}
            initial="hidden"
            whileInView="visible"
            viewport={GRID_VIEWPORT}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE } }}
            className={`grid gap-3 sm:gap-5 print:grid-cols-3! print:gap-4! ${
              filter === 'todas'
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                : 'mx-auto max-w-[17rem] grid-cols-1 sm:max-w-xs print:max-w-none!'
            }`}
          >
            {visibles.map((mesa) => (
              <QrCard
                key={mesa}
                mesa={mesa}
                url={`${baseUrl}/?mesa=${mesa}`}
                shortUrl={`${shortBase}/?mesa=${mesa}`}
                onDownloaded={handleDownloaded}
              />
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>
    </Section>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`relative isolate inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3.5 text-sm font-semibold transition-colors duration-300 ${
        active ? 'text-foam' : 'border border-deep/15 bg-white/70 text-deep hover:bg-white'
      }`}
    >
      {active ? (
        <motion.span
          layoutId="qr-chip-active"
          aria-hidden="true"
          className="absolute inset-0 -z-10 rounded-full bg-deep shadow-[0_8px_20px_-10px_rgb(19_50_74/0.7)]"
          transition={{ duration: 0.45, ease: EASE }}
        />
      ) : null}
      {children}
    </motion.button>
  )
}
