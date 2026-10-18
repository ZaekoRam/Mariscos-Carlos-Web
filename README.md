# Mariscos Carlos — landing + demo de pedidos

Landing page and demo ordering system for **Mariscos Carlos** (Manzanillo, Colima). Built with React 19, Vite 8, Tailwind CSS v4, motion (`motion/react`), react-router and qrcode.react. All visible copy is Spanish (México).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build in dist/
npm run preview  # serve the build
```

## Routes

| Route | What it is |
| --- | --- |
| `/` | Landing, in order of importance: hero with the three main actions, menu book, favorites, order (live ticket + WhatsApp preview), reservations, then the place (video band, about, reviews, visit us). `?lang=en` forces English. |
| `/?mesa=N` | Same landing for table N (1–12): the cart is preset to that table and a status pill shows that table's orders |
| `/mesero` | Demo: pick a table, add dishes, "Enviar a cocina" |
| `/cocina` | Demo: kanban Pendiente → En preparación → Listo |
| `/pedido/:id` | Customer status page with a live progress bar |
| `/qr` | Staff tool: one QR per table, download PNG/SVG or print the cards |

The demo screens sync live between tabs of the **same browser** with `BroadcastChannel("mariscos-carlos")` plus `localStorage`. Every storage access goes through `src/lib/storage.ts` (try/catch), so the demo still works in memory when storage is blocked. For a client demo, open `/mesero`, `/cocina` and `/pedido/<id>` side by side, or use "Cargar pedidos de ejemplo".

## What to edit before going live

| File | Purpose |
| --- | --- |
| `src/config/payment.ts` | Bank, CLABE and account holder. While empty, the page shows "Pendiente de confirmar" and copy buttons stay disabled. |
| `src/config/announcement.ts` | "Aviso del día" banner (`active`, `id`, `text`). Change `id` for each new notice. It currently shows an **example** notice; set `active: false` to hide it. |
| `src/config/site.ts` | Business facts (phones, hours, rating, socials) and `publicUrl`, the final domain used in the table QR codes. Set it before printing. |
| `src/data/menu.json` | Menu: 10 categories, 149 items. |
| `src/landing/media.ts` | Videos and photos used by the landing (see "Media" below). |
| `src/assets/logo-marlin-*.webp`, `logo.svg` | Marlin badge cut out of the official logo ("Los Más Frescos · Desde 2004"). |
| `src/data/menu.en.json` | English translation of the menu (names, descriptions, options, notes). |
| `src/landing/ReviewsBand.tsx` | 3 review cards marked "Ejemplo — reemplazar con reseñas reales". |

### About `menu.json`

No `menu.json` was attached to the brief, so it was transcribed from the 7 photos of the printed menu (WhatsApp images, 14 Oct 2026). Handwritten price stickers override printed prices. Per-kilo items (`por_kilo`, `precio_texto`) are excluded from the estimated total and flagged "peso por confirmar" in the WhatsApp message. The clock icon on the printed menu is stored as `preparacion_larga` and shown as "tarda un poco más en prepararse"; confirm that meaning with the restaurant.

## Languages (ES / EN)

- The public pages (landing, cart, payment details, order status) have an ES/EN toggle in the header, the mobile menu and the footer. The choice is remembered. Without a saved choice, a browser set to English opens the site in English.
- UI text is written inline as `t('Español', 'English')` (`src/i18n/lang.tsx`). Menu text comes from `src/data/menu.en.json` via `src/i18n/menuText.ts`.
- WhatsApp messages to the restaurant (orders, reservations, payment) are **always in Spanish** so the staff can read them.
- Staff screens (`/mesero`, `/cocina`, `/qr`) are always in Spanish.

## Media

- **Real photos** (`public/media/real/`): facade, aguachile, breaded shrimp and shrimp cocktail, cropped from the restaurant's own Instagram posts to remove the text overlays. They're 1080 px originals; replace them with high-resolution photos when available.
- **Illustrative photos** (Unsplash, free for commercial use, no attribution required): used for dishes without a real photo. Each one is marked "Foto ilustrativa" on the page.
- **Videos** (Mixkit, free for commercial use, no attribution required): beach at golden hour (hero), waves on the sand, sunset over the sea, palms at sunset. They're loaded from Mixkit's CDN. For production, download the 720p files into `public/media/` and update the paths in `src/landing/media.ts`.
- Videos only play while they're on screen and never play under `prefers-reduced-motion`.

## Notes

- **Effects:** Lenis smooth scrolling, video parallax that also follows the cursor, a menu book whose pages open with a zoom and can be flipped (arrows, keyboard or swipe), a favorites list where the dish photo follows the cursor, a giant MANZANILLO filled with the wave video that zooms into a full-screen video, words that light up as you scroll, animated counters, a dish marquee that tilts with scroll speed, and an intro curtain (once per session). All of them turn off with `prefers-reduced-motion`.
- **Business facts** come from `src/config/site.ts`. "Desde 2004" and "Los más frescos" come from the official logo.
- **Open/closed status** is computed in `America/Mexico_City` (`src/lib/hours.ts`), independent of the visitor's device time zone.
- **Contrast:** white text on `--color-sunset` (#E8552B) is 3.6:1, which fails WCAG AA for normal text. Buttons with white text therefore use `--color-sunset-deep` (#C4441E, 5:1). The original sunset color is kept for accents.
- **Reduced motion:** with `prefers-reduced-motion`, parallax, the floating phone, the marquee, smooth scrolling and video autoplay stop, and the typing animation shows full messages.
- **SPA hosting:** routes like `/cocina` need a fallback to `index.html`. On Netlify use `/* /index.html 200`; on Vercel the default rewrites already do this.
