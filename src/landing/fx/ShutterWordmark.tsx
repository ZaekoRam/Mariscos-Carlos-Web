import { useInView, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import logo from '../../assets/logo-marlin-256.webp'
import { approach, blades, CAP, glyphOf, layout, restPivot, SHUTTER, type Placed } from './shutterGlyphs'

/*
 * Nombre gigante del footer con el alfabeto geométrico de "Shutter Glyph Footer" (21st.dev,
 * código pegado por el cliente). Una letra se cambia por una persiana de tres aspas cuyo pivote
 * sigue al cursor; detrás se asoma el marlín. Pasar el cursor por una letra la parte por la
 * cintura; un clic la voltea; un clic en la persiana la gira un cuarto de vuelta.
 *
 * Rendimiento: el bucle de animación sólo corre mientras el pivote se está moviendo y la sección
 * está a la vista; las letras usan transiciones CSS de transform.
 */

const CSS = `
.sgw{position:relative;display:block;width:100%;height:auto;overflow:hidden}
.sgw-rise{transition:transform 1.15s cubic-bezier(.16,.84,.2,1) var(--d,0ms)}
.sgw[data-in='false'] .sgw-rise{transform:translateY(120px)}
.sgw-g{cursor:pointer}
.sgw-half{transition:transform .45s cubic-bezier(.2,.9,.25,1.15)}
@media (hover:hover){.sgw-g:hover .sgw-up{transform:translate(5px,-1.5px)}.sgw-g:hover .sgw-dn{transform:translate(-5px,1.5px)}}
.sgw-flip{transform-box:fill-box;transform-origin:50% 50%}
.sgw-flip.is-flip{animation:sgw-flip .7s cubic-bezier(.2,.8,.2,1)}
@keyframes sgw-flip{0%{transform:scaleY(1)}45%{transform:scaleY(-1)}100%{transform:scaleY(1)}}
@media (prefers-reduced-motion:reduce){.sgw .sgw-rise,.sgw .sgw-half{transition:none!important}.sgw .sgw-flip{animation:none!important}.sgw[data-in='false'] .sgw-rise{transform:none}}
`

const HEAD = 10

function Letter({ item, index, uid }: { item: Placed; index: number; uid: string }) {
  const [flip, setFlip] = useState(0)
  const glyph = glyphOf(item.ch)
  if (!glyph.d.length) return null
  return (
    <g className="sgw-rise" style={{ '--d': `${index * 55}ms` } as CSSProperties}>
      <g
        className="sgw-g"
        transform={`translate(${item.x} 0)`}
        onClick={() => setFlip((n) => n + 1)}
      >
        <g key={flip} className={`sgw-flip ${flip ? 'is-flip' : ''}`}>
          <rect x={0} y={0} width={glyph.w} height={CAP} fill="transparent" />
          <g className="sgw-half sgw-up" clipPath={`url(#${uid}-top)`}>
            {glyph.d.map((d) => (
              <path key={d} d={d} fillRule="evenodd" />
            ))}
          </g>
          <g className="sgw-half sgw-dn" clipPath={`url(#${uid}-bottom)`}>
            {glyph.d.map((d) => (
              <path key={d} d={d} fillRule="evenodd" />
            ))}
          </g>
        </g>
      </g>
    </g>
  )
}

function Shutter({ item, index, active, still, uid }: { item: Placed; index: number; active: boolean; still: boolean; uid: string }) {
  const hitRef = useRef<SVGRectElement>(null)
  const polys = useRef<(SVGPolygonElement | null)[]>([])
  const state = useRef({ turns: 0, px: restPivot(0)[0], py: restPivot(0)[1], tx: restPivot(0)[0], ty: restPivot(0)[1], raf: 0, last: 0 })

  const draw = () => {
    const s = state.current
    const shapes = blades(s.px, s.py, s.turns)
    shapes.forEach((pts, i) => {
      const el = polys.current[i]
      if (!el) return
      let attr = ''
      for (let k = 0; k + 1 < pts.length; k += 2) attr += `${pts[k].toFixed(2)},${pts[k + 1].toFixed(2)} `
      el.setAttribute('points', attr.trim())
    })
  }

  const kick = () => {
    const s = state.current
    if (s.raf || still) return
    s.last = performance.now()
    const step = (now: number) => {
      const dt = (now - s.last) / 1000
      s.last = now
      s.px = approach(s.px, s.tx, 0.14, dt)
      s.py = approach(s.py, s.ty, 0.14, dt)
      draw()
      if (Math.abs(s.px - s.tx) < 0.05 && Math.abs(s.py - s.ty) < 0.05) {
        s.px = s.tx
        s.py = s.ty
        draw()
        s.raf = 0
        return
      }
      s.raf = requestAnimationFrame(step)
    }
    s.raf = requestAnimationFrame(step)
  }

  // El pivote sigue al cursor (sólo con la sección a la vista y con mouse).
  useEffect(() => {
    draw()
    if (!active || still || !window.matchMedia('(pointer: fine)').matches) return
    const s = state.current
    const onMove = (event: PointerEvent) => {
      const rect = hitRef.current?.getBoundingClientRect()
      if (!rect || !rect.width) return
      const x = ((event.clientX - rect.left) / rect.width) * SHUTTER
      const y = ((event.clientY - rect.top) / rect.height) * SHUTTER
      const far = x < -SHUTTER * 2.5 || x > SHUTTER * 3.5 || y < -SHUTTER * 2 || y > SHUTTER * 3
      const [rx, ry] = restPivot(s.turns)
      s.tx = far ? rx : x
      s.ty = far ? ry : y
      kick()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(s.raf)
      s.raf = 0
    }
  }, [active, still]) // eslint-disable-line react-hooks/exhaustive-deps

  const rotate = () => {
    const s = state.current
    s.turns = (s.turns + 1) % 4
    const [rx, ry] = restPivot(s.turns)
    s.tx = rx
    s.ty = ry
    if (still) {
      s.px = rx
      s.py = ry
      draw()
    } else kick()
  }

  return (
    <g className="sgw-rise" style={{ '--d': `${index * 55}ms` } as CSSProperties}>
      <g transform={`translate(${item.x} 0)`} className="sgw-g" onClick={rotate}>
        <clipPath id={`${uid}-sq`}>
          <rect x={0} y={0} width={SHUTTER} height={SHUTTER} rx={4} />
        </clipPath>
        <g clipPath={`url(#${uid}-sq)`}>
          <rect x={0} y={0} width={SHUTTER} height={SHUTTER} fill="#13324A" />
          <image href={logo} x={9} y={9} width={82} height={82} preserveAspectRatio="xMidYMid meet" />
          <g fill="#F2B134">
            {[0, 1, 2].map((i) => (
              <polygon key={i} ref={(el) => void (polys.current[i] = el)} />
            ))}
          </g>
        </g>
        <rect ref={hitRef} x={0} y={0} width={SHUTTER} height={SHUTTER} fill="transparent" />
      </g>
    </g>
  )
}

function Line({ word, shutterAt, active, still, offset }: { word: string; shutterAt: number; active: boolean; still: boolean; offset: number }) {
  const uid = useId().replace(/:/g, '')
  const { items, width } = layout(word, shutterAt, 14)
  return (
    <svg viewBox={`-2 ${-HEAD} ${width + 4} ${CAP + HEAD * 2}`} className="sgw-line block h-auto w-full overflow-visible" fill="currentColor" aria-hidden="true">
      <defs>
        <clipPath id={`${uid}-top`}>
          <rect x={-20} y={-40} width={260} height={40 + CAP / 2 + 0.8} />
        </clipPath>
        <clipPath id={`${uid}-bottom`}>
          <rect x={-20} y={CAP / 2 - 0.8} width={260} height={CAP} />
        </clipPath>
      </defs>
      {items.map((item, i) =>
        item.shutter ? (
          <Shutter key={i} item={item} index={offset + i} active={active} still={still} uid={`${uid}-${i}`} />
        ) : (
          <Letter key={i} item={item} index={offset + i} uid={uid} />
        ),
      )}
    </svg>
  )
}

/**
 * "MARISCOS CARLOS": en escritorio una sola línea; en celular dos líneas (MARISCOS / CARLOS).
 * La persiana reemplaza la "O" de CARLOS.
 */
export default function ShutterWordmark({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  const seen = useInView(ref, { once: true, amount: 0.3 })
  const near = useInView(ref, { margin: '200px 0px 200px 0px' })
  const shown = reduce || seen

  return (
    <div ref={ref} className={`sgw text-shell select-none ${className}`} data-in={shown ? 'true' : 'false'} aria-hidden="true">
      <style href="mc-shutter-glyph-wordmark" precedence="default">
        {CSS}
      </style>
      <div className="hidden sm:block">
        <Line word="MARISCOS CARLOS" shutterAt={13} active={near} still={reduce} offset={0} />
      </div>
      {/* Cada renglón con su propia máscara: así las letras de MARISCOS no suben por encima de CARLOS. */}
      <div className="flex flex-col gap-[3vw] sm:hidden">
        <div className="overflow-hidden">
          <Line word="MARISCOS" shutterAt={-1} active={false} still={reduce} offset={0} />
        </div>
        <div className="overflow-hidden">
          <Line word="CARLOS" shutterAt={4} active={near} still={reduce} offset={8} />
        </div>
      </div>
    </div>
  )
}
