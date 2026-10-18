import { useReducedMotion } from 'motion/react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useLang } from '../../i18n/lang'

/*
 * Polaroids colgadas de un cordel con pinzas de madera. Se arrastra el cordel (o se usan las
 * flechas) y las fotos se deslizan columpiándose según la velocidad; la del centro es la activa.
 *
 * Basado en @kedhareswer/polaroid-line-carousel (21st.dev, licencia MIT), adaptado a Mariscos
 * Carlos: textos bilingües, paleta de la marca y una física que se DUERME en cuanto todo queda
 * quieto (sin requestAnimationFrame en reposo ni fuera de pantalla). Despierta al arrastrar, con
 * flechas/teclado, con el autoplay, al cambiar de tamaño o al pasar el cursor sobre una foto.
 */

export type PolaroidSlide = {
  src: string
  srcSet?: string
  alt: string
  /** Texto escrito a mano en el marco de la foto. */
  title: string
  caption?: string
  /** object-position de la foto dentro del cuadro. */
  position?: string
  /** Etiqueta sobre la foto, p. ej. "Foto ilustrativa". */
  badge?: string
}

export type PolaroidLineCarouselProps = {
  slides: PolaroidSlide[]
  /** Cualquier longitud CSS. */
  height?: number | string
  /** Ancho máximo de cada polaroid en px (se reduce en pantallas chicas). */
  cardWidth?: number
  /** Cuánto cuelga el cordel al centro, px. */
  sag?: number
  /** Cuánto se columpian las fotos; 0 las deja quietas. */
  swing?: number
  /** ms por foto (mínimo 3500); 0 lo apaga. Sólo corre con el carrusel a la vista. */
  autoplay?: number
  /** Foto con la que empieza. */
  start?: number
  /** Color del cordel. */
  rope?: string
  /** Color del texto de la barra inferior. */
  ink?: string
  /** Color con el que se atenúan las fotos que no están al centro (el del fondo). */
  dim?: string
  /** Segunda guirnalda de foquitos encima del cordel. */
  lights?: boolean
  ariaLabel?: string
  onChange?: (index: number) => void
  className?: string
  style?: CSSProperties
}

/* ------------------------------------------------------------------------------ lógica */

function wrap(i: number, n: number): number {
  return n ? ((i % n) + n) % n : 0
}

function clamp(v: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, v))
}

/** Lleva d al rango [-total/2, total/2) (carrusel infinito). */
function wrapRange(d: number, total: number): number {
  return ((((d + total / 2) % total) + total) % total) - total / 2
}

/** Altura del cordel que cuelga `sag` px entre (0, y0) y (w, y0), en x. */
function stringY(x: number, w: number, y0: number, sag: number): number {
  const t = clamp(x / w, 0, 1)
  return y0 + 4 * sag * t * (1 - t)
}

/** Un paso de resorte críticamente amortiguado hacia target. */
function springStep(x: number, v: number, target: number, dt: number, k = 64): [number, number] {
  const c = 2 * Math.sqrt(k)
  const nv = v + (k * (target - x) - c * v) * dt
  return [x + nv * dt, nv]
}

/** Un paso del columpio de una foto: se queda atrás del movimiento, la gravedad la regresa y se amortigua. */
function swingStep(a: number, w: number, lineVel: number, dt: number, gain: number): [number, number] {
  const nw = w + (-38 * a - 4.4 * w + lineVel * 0.0034 * gain) * dt
  return [clamp(a + nw * dt, -0.6, 0.6), nw]
}

function smoothstep(k: number): number {
  return k * k * (3 - 2 * k)
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/** Pseudoaleatorio estable por índice (inclinación de reposo y "peso" de cada foto). */
function hash(i: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return s - Math.floor(s)
}

type Layout = { w: number; h: number; cw: number; spacing: number; y0: number; sag: number; narrow: boolean }

const EMPTY_LAYOUT: Layout = { w: 0, h: 0, cw: 240, spacing: 0, y0: 56, sag: 0, narrow: false }

/*
 * Celular: la barra va pegada ARRIBA (contador + flechas en un renglón y, debajo, título y pie a
 * todo el ancho), a NARROW_GAP px de la foto activa; así nunca la toca y las flechas no brincan
 * cuando el pie cambia de uno a dos renglones. NARROW_BAR es el alto máximo de esa barra.
 */
const NARROW_GAP = 20
const NARROW_BAR = 120
const NARROW_PAD = 8

/** Borde inferior de la polaroid activa: centro del cordel + margen (8) + marco (1.145 × ancho + 10). */
function cardBottom(L: Pick<Layout, 'y0' | 'sag' | 'cw'>): number {
  return L.y0 + L.sag + 18 + 1.145 * L.cw
}

function computeLayout(w: number, h: number, cardWidth: number, sagMax: number): Layout {
  const narrow = w < 640
  const sag = Math.round(Math.min(sagMax, w * 0.045))
  const y0 = narrow ? 44 : Math.round(clamp(h * 0.115, 48, 66))
  // alto de la polaroid ≈ 1.16 × ancho + pinza
  const byHeight = narrow
    ? (h - NARROW_PAD - NARROW_BAR - NARROW_GAP - y0 - sag - 18) / 1.145
    : (h - 96 - y0 - sag - 24) / 1.16
  const cw = Math.round(clamp(Math.min(cardWidth, byHeight, w * (narrow ? 0.6 : 0.3)), 140, cardWidth))
  const spacing = Math.round(cw * (narrow ? 1.07 : 1.15))
  return { w, h, cw, spacing, y0, sag, narrow }
}

/** Sólo hay cordel infinito si sobran fotos para llenar la pantalla sin que se vea el salto. */
function isLoop(L: Layout, n: number): boolean {
  return n >= 4 && L.spacing > 0 && n * L.spacing >= L.w + 2.5 * L.cw
}

function ropePath(w: number, y0: number, sag: number): string {
  return `M-12 ${y0} Q${w / 2} ${y0 + 2 * sag} ${w + 12} ${y0}`
}

/* ------------------------------------------------------------------------------ estilos */

const PL_CSS = `
.pl-root{position:relative;width:100%;overflow:hidden;background:var(--pl-bg);color:var(--pl-ink);user-select:none;-webkit-user-select:none;touch-action:pan-y;cursor:grab;--pl-gx:max(20px,calc((100% - 1280px) / 2))}
@media (min-width:640px){.pl-root{--pl-gx:max(32px,calc((100% - 1280px) / 2))}}
.pl-root[data-drag='1']{cursor:grabbing}
.pl-root:focus-visible{outline:3px solid #e8552b;outline-offset:-3px}
.pl-string{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}
.pl-card{position:absolute;left:0;top:0;width:var(--pl-cw);transform-origin:50% 0;will-change:transform;visibility:hidden;touch-action:pan-y}
.pl-print{position:relative;margin-top:8px;padding:calc(var(--pl-cw) * .055) calc(var(--pl-cw) * .055) 0;background:linear-gradient(170deg,#fffdf8,#f5eedf);border-radius:2px;box-shadow:0 1px 2px rgba(0,0,0,.25),0 22px 36px -16px rgba(0,0,0,.7)}
.pl-print::after{content:'';position:absolute;inset:0;border-radius:2px;background:var(--pl-dim);opacity:0;transition:opacity .45s ease;pointer-events:none}
.pl-card[data-on='0'] .pl-print::after{opacity:.16}
.pl-shot{position:relative;aspect-ratio:1;overflow:hidden;background:#d8cfbf}
.pl-shot img{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;display:block;pointer-events:none}
.pl-shot::after{content:'';position:absolute;inset:0;background:linear-gradient(140deg,rgba(255,255,255,.2),rgba(255,255,255,0) 38%);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);pointer-events:none}
.pl-tag{position:absolute;left:6px;bottom:6px;z-index:1;padding:3px 7px;border-radius:999px;background:rgba(10,27,40,.78);color:#fbf6ec;font:600 9px/1.2 Inter,sans-serif;letter-spacing:.06em;text-transform:uppercase}
.pl-note{height:calc(var(--pl-cw) * .2 + 10px);display:flex;align-items:center;justify-content:center;padding:0 8px;color:#2b2520}
.pl-note span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Fraunces,serif;font-style:italic;font-size:calc((var(--pl-cw) * .066 + 3px) * var(--pl-fit,1));line-height:1.2;transform:rotate(-1.6deg)}
.pl-peg{position:absolute;left:50%;top:-10px;z-index:2;width:11px;height:31px;margin-left:-5.5px;border-radius:2px 2px 3px 3px;background:linear-gradient(90deg,#8a6236,#c69d66 26%,#e7cb9b 50%,#c19760 74%,#83592c);box-shadow:0 3px 4px rgba(0,0,0,.45)}
.pl-peg::before{content:'';position:absolute;top:2px;bottom:2px;left:50%;width:1px;margin-left:-.5px;background:rgba(58,36,12,.6)}
.pl-peg::after{content:'';position:absolute;left:-1.5px;right:-1.5px;top:10px;height:4px;border-radius:2px;background:linear-gradient(#f3f3f3,#8f8f8f);box-shadow:0 1px 1px rgba(0,0,0,.35)}
.pl-bar{position:absolute;left:var(--pl-gx);right:var(--pl-gx);bottom:clamp(14px,2.6vw,30px);display:flex;align-items:flex-end;gap:16px;cursor:default}
.pl-cap{flex:1;min-width:0;overflow:hidden;padding-bottom:2px}
.pl-cap>*{display:block;animation:pl-in .6s cubic-bezier(.16,1,.3,1) both}
.pl-cap>*:nth-child(2){animation-delay:.05s}
.pl-cap>*:nth-child(3){animation-delay:.1s}
.pl-count{font-size:12px;line-height:1;letter-spacing:.22em;color:var(--pl-muted)}
.pl-count b{color:#f2b134;font-weight:600}
.pl-title{margin-top:8px;font-family:Fraunces,serif;font-style:italic;font-size:clamp(21px,2.1vw,28px);line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pl-sub{margin-top:4px;font-size:13px;line-height:1.45;color:var(--pl-muted)}
.pl-badge{display:inline-block;margin-right:8px;padding:1px 7px;border:1px solid currentColor;border-radius:999px;font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;vertical-align:1px}
.pl-ctrls{display:flex;gap:8px;flex-shrink:0}
.pl-root[data-narrow='1'] .pl-bar{top:var(--pl-bar-top);bottom:auto;display:block}
.pl-root[data-narrow='1'] .pl-ctrls{position:absolute;top:0;right:0}
.pl-root[data-narrow='1'] .pl-cap{padding-bottom:0}
.pl-root[data-narrow='1'] .pl-count{line-height:44px}
.pl-root[data-narrow='1'] .pl-title{margin-top:2px;font-size:22px}
.pl-root[data-narrow='1'] .pl-sub{margin-top:6px;font-size:14px}
.pl-root[data-narrow='1'] .pl-badge{font-size:11px}
.pl-root[data-narrow='1'] .pl-tag{left:7px;bottom:7px;padding:3px 8px;font-size:10px}
.pl-btn{appearance:none;width:44px;height:44px;border-radius:50%;border:1px solid var(--pl-line);background:transparent;color:inherit;display:grid;place-items:center;cursor:pointer;transition:background-color .2s ease,color .2s ease,border-color .2s ease}
.pl-btn:hover{background:var(--pl-ink);border-color:var(--pl-ink);color:var(--pl-bgsolid)}
.pl-btn:focus-visible{outline:3px solid #e8552b;outline-offset:2px}
.pl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes pl-in{from{transform:translateY(100%);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.pl-cap>*{animation:none}.pl-print::after{transition:none}}
`

/* ------------------------------------------------------------------------------ componente */

export default function PolaroidLineCarousel({
  slides,
  height = 520,
  cardWidth = 280,
  sag = 40,
  swing = 1,
  autoplay = 0,
  start = 0,
  rope = '#B08A5A',
  ink = '#FBF6EC',
  dim = '#0F2A3D',
  lights = false,
  ariaLabel,
  onChange,
  className,
  style,
}: PolaroidLineCarouselProps) {
  const { t } = useLang()
  const reduce = useReducedMotion() ?? false
  const n = slides.length
  const startIndex = clamp(Math.round(start), 0, Math.max(0, n - 1))

  const [active, setActive] = useState(startIndex)
  const [dragging, setDragging] = useState(false)
  const [geom, setGeom] = useState<Layout>(EMPTY_LAYOUT)
  const [inView, setInView] = useState(false)
  const [playing, setPlaying] = useState(autoplay > 0)

  const rootRef = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const layout = useRef<Layout>(EMPTY_LAYOUT)
  const sim = useRef({
    off: 0,
    vel: 0,
    target: 0,
    a: [] as number[],
    w: [] as number[],
    z: [] as number[],
    shown: [] as boolean[],
    ready: false,
  })
  const drag = useRef<null | { id: number; x: number; y: number; off: number; lx: number; lt: number; v: number; moved: boolean }>(null)
  const activeRef = useRef(startIndex)
  const wakeRef = useRef<() => void>(() => {})
  const swingRef = useRef(swing)
  swingRef.current = swing
  const lastTouch = useRef(0)
  const focusRef = useRef(false)
  const hoverCard = useRef(-1)
  const lastMouseX = useRef(0)

  useEffect(() => {
    onChange?.(active)
  }, [active, onChange])

  // Con movimiento reducido no hay autoplay.
  useEffect(() => {
    if (reduce) setPlaying(false)
  }, [reduce])

  // Física: un solo bucle que escribe directo al DOM y se duerme cuando todo está quieto.
  useEffect(() => {
    const root = rootRef.current
    if (!root || !n) return
    const S = sim.current
    S.a = Array.from({ length: n }, (_, i) => S.a[i] ?? 0)
    S.w = Array.from({ length: n }, (_, i) => S.w[i] ?? 0)
    S.z = Array.from({ length: n }, () => NaN)
    S.shown = Array.from({ length: n }, () => false)
    const rest = Array.from({ length: n }, (_, i) => (hash(i) - 0.5) * 0.075)
    const weight = Array.from({ length: n }, (_, i) => 0.8 + hash(i + 31) * 0.4)

    let raf = 0
    let prev = 0
    let visible = false
    let gusted = false

    const render = () => {
      const L = layout.current
      if (!L.spacing) return
      const { w, cw, spacing, y0 } = L
      const loop = isLoop(L, n)
      const total = n * spacing
      for (let i = 0; i < n; i++) {
        const el = cards.current[i]
        if (!el) continue
        let dx = i * spacing - S.off
        if (loop) dx = wrapRange(dx, total)
        const x = w / 2 + dx
        const show = x > -cw && x < w + cw
        if (show !== S.shown[i]) {
          el.style.visibility = show ? 'visible' : 'hidden'
          S.shown[i] = show
        }
        if (!show) continue
        const k = smoothstep(clamp(1 - Math.abs(dx) / spacing, 0, 1))
        const rot = S.a[i] + rest[i] * (1 - k)
        const sc = 0.84 + 0.16 * k
        const y = stringY(x, w, y0, L.sag)
        el.style.transform =
          'translate3d(' + (x - cw / 2).toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + rot.toFixed(4) + 'rad) scale(' + sc.toFixed(3) + ')'
        const z = 40 - Math.round((Math.abs(dx) / spacing) * 4)
        if (z !== S.z[i]) {
          el.style.zIndex = String(z)
          S.z[i] = z
        }
      }
      const idx = Math.round(S.off / spacing)
      const near = loop ? wrap(idx, n) : clamp(idx, 0, n - 1)
      if (near !== activeRef.current) {
        activeRef.current = near
        setActive(near)
      }
    }

    const frame = (now: number) => {
      raf = 0
      if (!visible) return
      const L = layout.current
      const dt = clamp((now - prev) / 1000, 0.001, 0.033)
      prev = now
      const d = drag.current
      const isDragging = !!d && d.moved
      let lineVel = 0
      if (isDragging) {
        // Si el dedo se queda quieto a media arrastrada, la velocidad se va apagando.
        if (now - d.lt > 40) d.v *= 0.86
        lineVel = d.v * 1000
      } else if (reduce) {
        S.off = S.target
        S.vel = 0
      } else {
        const before = S.off
        const r = springStep(S.off, S.vel, S.target, dt)
        S.off = r[0]
        S.vel = r[1]
        lineVel = -(S.off - before) / dt
      }
      let busy = isDragging || Math.abs(S.target - S.off) > 0.3 || Math.abs(S.vel) > 3
      const g = reduce ? 0 : swingRef.current
      for (let i = 0; i < n; i++) {
        if (!g) {
          S.a[i] = 0
          S.w[i] = 0
          continue
        }
        const r = swingStep(S.a[i], S.w[i], lineVel * weight[i], dt, g)
        S.a[i] = r[0]
        S.w[i] = r[1]
        if (Math.abs(r[0]) > 6e-4 || Math.abs(r[1]) > 6e-3) busy = true
      }
      if (!busy) {
        // Todo quieto: se fija la posición exacta y el bucle se duerme.
        S.off = S.target
        S.vel = 0
        S.a.fill(0)
        S.w.fill(0)
        if (L.spacing && isLoop(L, n)) {
          const total = n * L.spacing
          const laps = Math.floor(S.target / total)
          if (laps) {
            S.target -= laps * total
            S.off = S.target
          }
        }
        render()
        return
      }
      render()
      raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (raf || !visible) return
      prev = performance.now()
      raf = requestAnimationFrame(frame)
    }
    wakeRef.current = wake

    const measure = (force = false) => {
      const r = root.getBoundingClientRect()
      if (!r.width || !r.height) return
      const prevL = layout.current
      const L = computeLayout(r.width, r.height, cardWidth, sag)
      if (!force && prevL.w === L.w && prevL.h === L.h && prevL.cw === L.cw) return
      const idx = S.ready && prevL.spacing ? Math.round(S.target / prevL.spacing) : startIndex
      S.ready = true
      layout.current = L
      S.target = idx * L.spacing
      S.off = S.target
      S.vel = 0
      setGeom(L)
      render()
      wake()
    }
    const ro = new ResizeObserver(() => measure())
    ro.observe(root)
    measure(true)

    // Trackpad (dos dedos de lado) o Shift + rueda: el cordel se desliza y, al soltar, se acomoda
    // en la foto más cercana. La rueda vertical normal sigue bajando la página.
    let wheelTimer = 0
    const onWheel = (e: WheelEvent) => {
      const L = layout.current
      if (!L.spacing || e.ctrlKey) return
      let dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0
      if (!dx) return
      e.preventDefault()
      if (e.deltaMode === 1) dx *= 16
      else if (e.deltaMode === 2) dx *= L.w
      lastTouch.current = performance.now()
      setPlaying(false)
      let target = S.target + dx
      if (!isLoop(L, n)) target = clamp(target, -L.spacing * 0.3, (n - 1 + 0.3) * L.spacing)
      S.target = target
      wake()
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        let idx = Math.round(S.target / L.spacing)
        if (!isLoop(L, n)) idx = clamp(idx, 0, n - 1)
        S.target = idx * L.spacing
        wake()
      }, 140)
    }
    root.addEventListener('wheel', onWheel, { passive: false })

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1]
        visible = e.isIntersecting
        const mostly = e.intersectionRatio >= 0.35
        setInView(mostly)
        if (!visible) return
        // Un soplo de brisa al llegar: se columpian una vez y se quedan quietas.
        if (mostly && !gusted && !reduce && swingRef.current) {
          gusted = true
          for (let i = 0; i < n; i++) S.w[i] += (i % 2 ? -1 : 1) * (0.28 + hash(i + 7) * 0.3) * swingRef.current
        }
        wake()
      },
      { threshold: [0, 0.35] },
    )
    io.observe(root)

    return () => {
      cancelAnimationFrame(raf)
      raf = 0
      window.clearTimeout(wheelTimer)
      root.removeEventListener('wheel', onWheel)
      ro.disconnect()
      io.disconnect()
      wakeRef.current = () => {}
    }
  }, [n, reduce, cardWidth, sag, startIndex])

  /** Lleva la foto i al centro por el camino más corto. */
  const goTo = useCallback(
    (i: number) => {
      const L = layout.current
      const S = sim.current
      if (!L.spacing) return
      if (isLoop(L, n)) {
        const cur = Math.round(S.target / L.spacing)
        let delta = wrap(i - wrap(cur, n), n)
        if (delta > n / 2) delta -= n
        S.target = (cur + delta) * L.spacing
      } else {
        S.target = clamp(i, 0, n - 1) * L.spacing
      }
      wakeRef.current()
    },
    [n],
  )

  const step = useCallback(
    (dir: number, wrapAround = false) => {
      const L = layout.current
      const S = sim.current
      if (!L.spacing) return
      const cur = Math.round(S.target / L.spacing)
      if (isLoop(L, n)) {
        S.target = (cur + dir) * L.spacing
      } else {
        let next = cur + dir
        if (wrapAround && next > n - 1) next = 0
        S.target = clamp(next, 0, n - 1) * L.spacing
      }
      wakeRef.current()
    },
    [n],
  )

  // Autoplay: sólo con el carrusel a la vista y sin nadie arrastrando; nunca menos de 3.5 s.
  // No se detiene con el cursor encima (parecía trabado); para eso está el botón de pausa.
  useEffect(() => {
    if (!playing || !inView || reduce || n < 2 || autoplay <= 0) return
    const ms = Math.max(3500, autoplay)
    const id = window.setInterval(() => {
      if (document.hidden || drag.current || focusRef.current) return
      if (performance.now() - lastTouch.current < ms) return
      step(1, true)
    }, ms)
    return () => window.clearInterval(id)
  }, [playing, inView, reduce, n, autoplay, step])

  /** El usuario tomó el control: el autoplay se detiene (puede reanudarlo con el botón). */
  const userAct = () => {
    lastTouch.current = performance.now()
    setPlaying(false)
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if ((e.target as HTMLElement).closest('.pl-bar')) return
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, off: sim.current.off, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Botón soltado fuera del carrusel antes de empezar a arrastrar: se olvida ese arrastre.
    const stale = drag.current
    if (stale && !stale.moved && e.pointerType === 'mouse' && e.buttons === 0) drag.current = null
    const d = drag.current
    if (!d || d.id !== e.pointerId) {
      // Cursor sobre una foto: un empujoncito según hacia dónde se movió el mouse.
      if (e.pointerType !== 'mouse' || reduce || !swingRef.current) return
      const dxm = e.clientX - lastMouseX.current
      lastMouseX.current = e.clientX
      const card = (e.target as HTMLElement).closest('[data-i]')
      const i = card ? Number(card.getAttribute('data-i')) : -1
      if (i !== hoverCard.current) {
        hoverCard.current = i
        if (i >= 0) {
          const S = sim.current
          S.w[i] = (S.w[i] || 0) + clamp(-dxm * 0.05, -0.55, 0.55) * swingRef.current
          wakeRef.current()
        }
      }
      return
    }
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return
      d.moved = true
      setDragging(true)
      userAct()
      try {
        rootRef.current?.setPointerCapture(e.pointerId)
      } catch {
        // El puntero ya no existe: se sigue sin captura.
      }
    }
    const dt = Math.max(1, e.timeStamp - d.lt)
    d.v = 0.7 * ((e.clientX - d.lx) / dt) + 0.3 * d.v
    d.lx = e.clientX
    d.lt = e.timeStamp
    const L = layout.current
    let off = d.off - dx
    if (!isLoop(L, n)) {
      const max = (n - 1) * L.spacing
      if (off < 0) off *= 0.35
      if (off > max) off = max + (off - max) * 0.35
    }
    sim.current.off = off
    wakeRef.current()
  }

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, canceled: boolean) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const S = sim.current
    const L = layout.current
    if (d.moved) {
      setDragging(false)
      lastTouch.current = performance.now()
      if (e.timeStamp - d.lt > 90) d.v = 0
      S.vel = reduce ? 0 : -d.v * 1000
      const fling = clamp(d.v * 180, -L.spacing * 2.5, L.spacing * 2.5)
      let idx = Math.round((S.off - fling) / L.spacing)
      if (!isLoop(L, n)) idx = clamp(idx, 0, n - 1)
      S.target = idx * L.spacing
      wakeRef.current()
      return
    }
    if (canceled) return
    const card = (e.target as HTMLElement).closest('[data-i]')
    if (card) {
      const i = Number(card.getAttribute('data-i'))
      if (i !== activeRef.current) {
        userAct()
        goTo(i)
      }
    }
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'ArrowRight') step(1)
    else if (e.key === 'ArrowLeft') step(-1)
    else if (e.key === 'Home') goTo(0)
    else if (e.key === 'End') goTo(n - 1)
    else return
    e.preventDefault()
    userAct()
  }

  // Sólo el foco con teclado pausa el autoplay (un clic con el mouse también enfoca el carrusel).
  const onFocus = (e: ReactFocusEvent<HTMLDivElement>) => {
    focusRef.current = e.target.matches(':focus-visible')
  }
  const onBlur = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) focusRef.current = false
  }

  if (!n) return null

  const s = slides[active] ?? slides[0]
  const autoOn = autoplay > 0 && !reduce
  const cw = geom.cw
  const narrow = geom.narrow && geom.w > 0
  const bulbs = lights && geom.w ? lightBulbs(geom) : null

  return (
    <div
      ref={rootRef}
      className={['pl-root', className].filter(Boolean).join(' ')}
      style={{
        height,
        ['--pl-bg' as string]: 'transparent',
        ['--pl-bgsolid' as string]: dim,
        ['--pl-ink' as string]: ink,
        ['--pl-dim' as string]: dim,
        ['--pl-muted' as string]: `color-mix(in srgb, ${ink} 72%, transparent)`,
        ['--pl-line' as string]: `color-mix(in srgb, ${ink} 30%, transparent)`,
        ['--pl-cw' as string]: cw + 'px',
        ['--pl-bar-top' as string]: narrow ? Math.round(cardBottom(geom) + NARROW_GAP) + 'px' : undefined,
        ...style,
      }}
      data-drag={dragging ? '1' : '0'}
      data-narrow={narrow ? '1' : undefined}
      role="region"
      aria-roledescription={t('carrusel', 'carousel')}
      aria-label={ariaLabel ?? t('Fotos del restaurante', 'Restaurant photos')}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e, false)}
      onPointerCancel={(e) => endDrag(e, true)}
      onPointerEnter={(e) => {
        lastMouseX.current = e.clientX
      }}
      onPointerLeave={() => {
        hoverCard.current = -1
        if (drag.current && !drag.current.moved) drag.current = null
      }}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <style>{PL_CSS}</style>
      {geom.w ? (
        <svg className="pl-string" width={geom.w} height={geom.h} aria-hidden="true" focusable="false">
          {bulbs ? (
            <g>
              <defs>
                <radialGradient id="pl-glow">
                  <stop offset="0" stopColor="#F2B134" stopOpacity="0.55" />
                  <stop offset="1" stopColor="#F2B134" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d={bulbs.path} fill="none" stroke="#06121C" strokeWidth="1.4" />
              {bulbs.points.map(([x, y, drop, glow], i) => (
                <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                  <circle r="17" cy={drop + 9} fill="url(#pl-glow)" opacity={glow.toFixed(2)} />
                  <path d={`M0 0V${drop.toFixed(1)}`} stroke="#06121C" strokeWidth="1.2" />
                  <rect x="-2.2" y={drop} width="4.4" height="4.5" rx="1" fill="#2B2B2B" />
                  <ellipse cy={drop + 9.5} rx="3.7" ry="5.2" fill="#FFE2A3" opacity={(0.82 + glow * 0.18).toFixed(2)} />
                </g>
              ))}
            </g>
          ) : null}
          <path d={ropePath(geom.w, geom.y0 + 3, geom.sag)} fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="4" strokeLinecap="round" />
          <path d={ropePath(geom.w, geom.y0, geom.sag)} fill="none" stroke={rope} strokeWidth="3.2" strokeLinecap="round" />
          <path d={ropePath(geom.w, geom.y0, geom.sag)} fill="none" stroke="#6E5230" strokeWidth="3.2" strokeDasharray="1.6 3.4" opacity="0.75" />
          <path d={ropePath(geom.w, geom.y0 - 0.9, geom.sag)} fill="none" stroke="#E2C596" strokeWidth="0.8" strokeDasharray="2.4 2.6" opacity="0.7" />
        </svg>
      ) : null}

      {slides.map((sl, i) => (
        <div
          key={sl.src + i}
          className="pl-card"
          data-i={i}
          data-on={i === active ? '1' : '0'}
          ref={(el) => {
            cards.current[i] = el
          }}
          role="group"
          aria-roledescription={t('foto', 'photo')}
          aria-label={t(`${i + 1} de ${n}`, `${i + 1} of ${n}`)}
          aria-hidden={i === active ? undefined : true}
        >
          <div className="pl-print">
            <div className="pl-shot">
              <img
                src={sl.src}
                srcSet={sl.srcSet}
                sizes={sl.srcSet ? `${cw}px` : undefined}
                alt={sl.alt}
                loading="lazy"
                decoding="async"
                draggable={false}
                style={sl.position ? { objectPosition: sl.position } : undefined}
              />
              {sl.badge ? (
                <span className="pl-tag" aria-hidden="true">
                  {sl.badge}
                </span>
              ) : null}
            </div>
            <p className="pl-note" aria-hidden="true">
              <span style={{ ['--pl-fit' as string]: Math.min(1, 18 / Math.max(1, sl.title.length)).toFixed(3) }}>{sl.title}</span>
            </p>
          </div>
          <span className="pl-peg" aria-hidden="true" />
        </div>
      ))}

      <div className="pl-bar">
        <div className="pl-cap" key={active} aria-hidden="true">
          <span className="pl-count font-banner">
            <b>{pad2(active + 1)}</b> / {pad2(n)}
          </span>
          <span className="pl-title">{s.title}</span>
          {s.caption || s.badge ? (
            <span className="pl-sub">
              {s.badge ? <span className="pl-badge">{s.badge}</span> : null}
              {s.caption}
            </span>
          ) : null}
        </div>
        <div className="pl-ctrls">
          {autoOn ? (
            <button
              type="button"
              className="pl-btn"
              aria-label={playing ? t('Pausar fotos', 'Pause photos') : t('Reproducir fotos', 'Play photos')}
              onClick={() => {
                lastTouch.current = 0
                setPlaying((p) => !p)
              }}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <rect x="3" y="2.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
                  <rect x="8.4" y="2.5" width="2.6" height="9" rx="0.8" fill="currentColor" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M4 2.6v8.8a.6.6 0 0 0 .9.5l7-4.4a.6.6 0 0 0 0-1L4.9 2.1a.6.6 0 0 0-.9.5Z" fill="currentColor" />
                </svg>
              )}
            </button>
          ) : null}
          <button
            type="button"
            className="pl-btn"
            aria-label={t('Anterior', 'Previous')}
            onClick={() => {
              userAct()
              step(-1)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className="pl-btn"
            aria-label={t('Siguiente', 'Next')}
            onClick={() => {
              userAct()
              step(1)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="pl-sr" aria-live={playing && autoOn ? 'off' : 'polite'} aria-atomic="true">
        {t(`Foto ${active + 1} de ${n}`, `Photo ${active + 1} of ${n}`) + ': ' + s.title + (s.badge ? ` (${s.badge})` : '')}
      </div>
    </div>
  )
}

/** Guirnalda de foquitos: más arriba que el cordel y con su propia caída. */
function lightBulbs(L: Layout): { path: string; points: [number, number, number, number][] } {
  const y0 = Math.max(8, L.y0 - 38)
  const sag = L.sag * 0.9 + 8
  const count = Math.max(5, Math.round(L.w / (L.narrow ? 64 : 84)))
  // [x, y en el cable, largo del colgante, intensidad del brillo]
  const points: [number, number, number, number][] = []
  for (let k = 0; k < count; k++) {
    const x = ((k + 0.5) / count) * L.w
    points.push([x, stringY(x, L.w, y0, sag), 2 + hash(k + 3) * 5, 0.65 + hash(k + 11) * 0.35])
  }
  return { path: ropePath(L.w, y0, sag), points }
}
