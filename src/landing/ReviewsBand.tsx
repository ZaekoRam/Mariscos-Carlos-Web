import { motion, type Variants } from 'motion/react'
import { ExternalIcon, FacebookIcon, StarIcon } from '../components/icons'
import { SITE } from '../config/site'
import { useLang } from '../i18n/lang'
import { EASE } from '../lib/motion'
import PolaroidLineCarousel, { type PolaroidSlide } from './fx/PolaroidLineCarousel'
import { photo, photoSrcSet, PHOTO_ALT, REAL } from './media'
import { CountUp, Eyebrow, RevealTitle } from './primitives'

const EXAMPLES = [
  { tema: ['Sobre la comida', 'About the food'], texto: ['Aquí irá una reseña real sobre los platillos: el sabor, la frescura del marisco y las porciones.', 'A real review about the dishes will go here: flavor, freshness and portions.'] },
  { tema: ['Sobre el servicio', 'About the service'], texto: ['Espacio para una opinión real sobre la atención del equipo y la rapidez al servir.', 'Space for a real opinion about the staff and how fast we serve.'] },
  { tema: ['Sobre el lugar', 'About the place'], texto: ['Lugar para una reseña real sobre el ambiente y las mesas al aire libre.', 'Room for a real review about the atmosphere and the outdoor tables.'] },
]

/** Tarjetas de ejemplo: aparecen juntas (en celular van en fila deslizable, fuera de pantalla). */
const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay: i * 0.08 } }),
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-1 text-gold" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i))
        return (
          <motion.span
            key={i}
            className="relative inline-block size-7 md:size-9"
            initial={{ opacity: 0, scale: 0.4, rotate: -30 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 + i * 0.08 }}
          >
            <StarIcon className="absolute inset-0 size-full text-white/20" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <StarIcon className="size-7 md:size-9" />
            </span>
          </motion.span>
        )
      })}
    </span>
  )
}

/** Fotos del cordel: las reales del restaurante y, marcadas, algunas ilustrativas de platillos de la carta. */
function useMoments(): PolaroidSlide[] {
  const { t } = useLang()
  const illustrative = t('Foto ilustrativa', 'Illustrative photo')
  return [
    {
      src: REAL.camarones.src,
      alt: t(REAL.camarones.alt, 'Breaded shrimp with rice and coleslaw at Mariscos Carlos'),
      title: t('Camarones empanizados', 'Breaded shrimp'),
      caption: t('Con arroz y ensalada de col.', 'With rice and coleslaw.'),
    },
    {
      src: REAL.fachada.src,
      alt: t(REAL.fachada.alt, 'Mariscos Carlos storefront with palm trees'),
      title: t('Nuestra casa', 'Our place'),
      caption: t('Entre palmeras, detrás de la Central de Autobuses.', 'Among the palms, right behind the bus station.'),
      position: '42% 50%',
    },
    {
      src: REAL.coctel.src,
      alt: t(REAL.coctel.alt, 'Shrimp cocktail with avocado and saltine crackers'),
      title: t('Coctel de camarón', 'Shrimp cocktail'),
      caption: t('Con aguacate y galletas saladas.', 'With avocado and saltine crackers.'),
    },
    {
      src: photo('pulpo', 640),
      srcSet: photoSrcSet('pulpo', [400, 640, 900]),
      alt: t(PHOTO_ALT.pulpo, 'Grilled octopus tentacles'),
      title: t('Pulpo', 'Octopus'),
      caption: t('En la carta: orden y media orden de pulpo.', 'On the menu: full or half order of octopus.'),
      badge: illustrative,
    },
    {
      src: photo('ceviche', 640),
      srcSet: photoSrcSet('ceviche', [400, 640, 900]),
      alt: t(PHOTO_ALT.ceviche, 'Fish ceviche with red onion'),
      title: 'Ceviche',
      caption: t('De pescado o de camarón, en orden o media orden.', 'Fish or shrimp, full or half order.'),
      badge: illustrative,
    },
    {
      src: photo('tacos', 640),
      srcSet: photoSrcSet('tacos', [400, 640, 900]),
      alt: t(PHOTO_ALT.tacos, 'Shrimp tacos with avocado'),
      title: t('Tacos de camarón', 'Shrimp tacos'),
      caption: t('Dorados o empanizados.', 'Crispy or breaded.'),
      badge: illustrative,
    },
    {
      src: REAL.fachadaVertical.src,
      alt: t(REAL.fachadaVertical.alt, 'Entrance of Mariscos Carlos among palm trees'),
      title: t('La entrada', 'The entrance'),
      caption: t(`${SITE.lema}, desde ${SITE.desde}.`, `The freshest, since ${SITE.desde}.`),
      position: '50% 40%',
    },
    {
      src: REAL.aguachile.src,
      alt: t(REAL.aguachile.alt, 'Green shrimp aguachile with avocado and red onion, served at Mariscos Carlos'),
      title: t('Aguachile verde', 'Green aguachile'),
      caption: t('Camarón, aguacate y cebolla morada.', 'Shrimp, avocado and red onion.'),
    },
  ]
}

/** Calificación real (Google y Facebook), fotos colgadas en un cordel y tarjetas de ejemplo para reseñas. */
export default function ReviewsBand() {
  const { t } = useLang()
  const moments = useMoments()

  return (
    <section id="resenas" aria-labelledby="resenas-title" className="relative overflow-hidden bg-tide text-foam">
      {/* Luz cálida de farol: gradientes fijos (sin blur ni capas animadas). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(48% 38% at 88% 6%, rgb(232 85 43 / 0.16), transparent 72%), radial-gradient(62% 30% at 50% 58%, rgb(242 177 52 / 0.11), transparent 74%), linear-gradient(180deg, transparent 70%, rgb(10 27 40 / 0.55))',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 pt-20 sm:px-8 sm:pt-28 md:pt-36">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div>
            <Eyebrow tone="light">{t('Reseñas', 'Reviews')}</Eyebrow>
            <RevealTitle
              id="resenas-title"
              text={t('Lo que dicen\n*de la casa*', 'What people say\n*about us*')}
              className="mt-6 font-display text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.92] tracking-[-0.025em]"
              accentClassName="italic text-gold"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-end gap-x-12 gap-y-8">
              <div>
                <p className="font-display text-[clamp(5rem,13vw,10rem)] leading-[0.8] tracking-tight">
                  <CountUp to={SITE.calificacion.google} decimals={1} />
                </p>
                <div className="mt-4">
                  <Stars value={SITE.calificacion.google} />
                </div>
                <p className="mt-3 text-sm text-foam/80">
                  <span className="sr-only">
                    {SITE.calificacion.google} {t('de 5 estrellas', 'out of 5 stars')} ·{' '}
                  </span>
                  Google · {SITE.calificacion.resenasGoogleTexto} {t('reseñas', 'reviews')}
                </p>
              </div>
              <div className="w-full border-t border-white/20 pt-6 sm:w-auto sm:border-t-0 sm:border-l sm:pt-0 sm:pl-8">
                <p className="font-display text-6xl">
                  <CountUp to={SITE.calificacion.facebookRecomienda} suffix="%" />
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm text-foam/80">
                  <FacebookIcon className="size-4" /> {t('lo recomienda en Facebook', 'recommend us on Facebook')}
                </p>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={SITE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-foam px-6 font-semibold text-deep transition-colors hover:bg-white"
              >
                {t('Ver reseñas en Google', 'Read Google reviews')} <ExternalIcon className="size-4" />
                <span className="sr-only">{t('(se abre en otra pestaña)', '(opens in a new tab)')}</span>
              </a>
              <a
                href={SITE.redes.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-6 font-semibold transition-colors hover:bg-white/10"
              >
                <FacebookIcon className="size-4" /> {t('Ver en Facebook', 'See on Facebook')}
                <span className="sr-only">{t('(se abre en otra pestaña)', '(opens in a new tab)')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Momentos en la mesa: polaroids en un cordel de mecate */}
      <div className="relative mt-16 sm:mt-20 md:mt-28">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-8 gap-y-3 px-5 sm:px-8">
          <div>
            <p className="font-banner text-[13px] tracking-[0.26em] text-gold uppercase">{t('Galería', 'Gallery')}</p>
            <h3 className="mt-2 font-display text-[clamp(2rem,4vw,3.25rem)] leading-none tracking-[-0.02em] text-balance">
              {t('Momentos', 'Moments')} <em className="text-gold">{t('en la mesa', 'at the table')}</em>
            </h3>
          </div>
          <p className="flex items-center gap-2 text-sm text-foam/75">
            <svg viewBox="0 0 24 24" className="size-5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 12h10M7 12l3-3M7 12l3 3M17 12l-3-3M17 12l-3 3" />
            </svg>
            {t('Arrastra o desliza las fotos', 'Drag or swipe the photos')}
          </p>
        </div>
        <PolaroidLineCarousel
          slides={moments}
          height="clamp(480px, 15vw + 345px, 550px)"
          cardWidth={280}
          sag={40}
          autoplay={4500}
          rope="#B08A5A"
          lights
          ink="#FBF6EC"
          dim="#0F2A3D"
          className="mt-2"
        />
      </div>

      {/* Tarjetas de ejemplo: secundarias, para reemplazar con reseñas reales.
          Celular: fila deslizable (se asoma la siguiente) en vez de tres tarjetas apiladas. */}
      <div className="relative mx-auto max-w-7xl px-5 pt-8 pb-20 sm:px-8 sm:pt-14 sm:pb-24 md:pt-16 md:pb-32">
        <motion.ul
          className="-mx-5 -mb-6 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-6 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:mb-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
        >
          {EXAMPLES.map((r, i) => (
            <motion.li
              key={r.tema[0]}
              custom={i}
              variants={CARD_VARIANTS}
              className="flex w-[84%] shrink-0 snap-start flex-col rounded-2xl border border-dashed border-white/25 p-5 sm:w-[46%] md:w-auto"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-lg italic">{t(r.tema[0], r.tema[1])}</p>
                <span aria-hidden="true" className="-mt-1 font-display text-4xl leading-none text-sunset">
                  “
                </span>
              </div>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-foam/75 md:text-sm">{t(r.texto[0], r.texto[1])}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-foam/80 md:text-xs">{t('Cliente de ejemplo', 'Sample customer')}</span>
                <span className="rounded-lg bg-gold px-2.5 py-1 text-[11px] font-semibold text-deep max-md:text-balance md:rounded-full md:py-0.5 md:text-[10px]">
                  {t('Ejemplo — reemplazar con reseñas reales', 'Sample — replace with real reviews')}
                </span>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
