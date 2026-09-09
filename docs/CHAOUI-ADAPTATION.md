# Sources for the SealPay interface

The workspace draws on two of the author's own projects. Neither source directory is modified, and
there is no runtime import from a machine-specific path — every component below is adapted into
this repository.

| Source | Location |
| --- | --- |
| ChaoUi component library | `C:\Users\mrcha\Desktop\Genlayer\AI\ChaoUi` |
| Chaos Market AI | `C:\Users\mrcha\Desktop\Genlayer\AI\chaos-market-ai` |

## From ChaoUi

| ChaoUi reference | SealPay adaptation |
| --- | --- |
| `navigation/dashboard-sidebar/DashboardSidebar.tsx` | `src/components/layout/DashboardSidebar.tsx`: collapsible, route-aware sidebar using Next links |
| `navigation/animated-tabs/AnimatedTabs.tsx` | `src/components/chaos/AnimatedTabs.tsx`: keyboard arrows/Home/End and ARIA relationships kept; the sliding pill is replaced by a rule under the active tab |
| `loaders/progress-bar/ProgressBar.tsx` | `src/components/chaos/ProgressBar.tsx`: accessible pending/complete progress, reduced to a hairline |
| `loaders/skeleton` | `src/components/chaos/Skeleton.tsx`: shimmer as a background-position animation, square by default |
| `cursor/splash-cursor/SplashCursor.tsx` | `src/components/chaos/SplashCursor.tsx`: the WebGL fluid simulation, with its three imports repointed, the file marked `"use client"`, and the two additions described below |
| `hooks/useInView`, `hooks/useMediaQuery` | `src/hooks/`: `useMediaQuery` is rewritten onto `useSyncExternalStore`, because the effect-based original trips React's set-state-in-effect rule |

`src/components/chaos/CursorLayer.tsx` wraps the splash cursor: `RAINBOW_MODE` is off and the
colour is pinned to the interface accent, and it renders nothing under `prefers-reduced-motion`
(the upstream component opts out on coarse pointers but not on reduced motion).

### Changes to the ported simulation

#### The GPU memory leak on resize — a real bug, fixed

Upstream never released a WebGL buffer it replaced. `resizeFBO` allocated the new texture and
dropped the old handle; `resizeDoubleFBO` replaced its write half outright; and `initFramebuffers`
rebuilt `divergence`, `curl` and `pressure` unconditionally on every call. A `WebGLTexture` is a
handle to driver-side memory that JavaScript garbage collection does not free on any schedule you
can rely on, so each of those was stranded GPU memory.

`initFramebuffers` runs on every viewport size change. Measured over 30 resizes at 1920×1080,
`deviceScaleFactor: 1`, by patching `createTexture`/`deleteTexture`:

| | textures created | textures deleted | leaked |
| --- | --- | --- | --- |
| Before | 230 | 0 | **230** |
| After | 230 | 230 | **0** |

Eight textures and eight framebuffers per resize. The dye pair alone is roughly 7.5 MB of that.
Opening DevTools resizes the viewport once; dragging its splitter fires `ResizeObserver`
continuously, which is enough to exhaust GPU memory and have the browser kill the renderer. Every
`FBO` now carries a `dispose()` and it is called wherever a buffer is replaced.

The reason this did not show up in ChaoUi's own gallery is that the demo there runs in `contained`
mode inside a small box. Here the simulation is full-viewport and mounted on every page.

#### Two additions

Neither is a correction — that component was written for a demo page, and here it runs behind a
payment interface.

- **`webglcontextlost` is handled, and the canvas is hidden, not just stopped.** A WebGL context
  can be taken away at any time: the GPU process restarts, a driver resets, another tab exhausts
  GPU memory. Upstream has no listener, so the render loop keeps issuing GL calls against a dead
  context every frame, forever. Stopping the loop is necessary but was not sufficient on its own:
  in non-contained mode this canvas is `fixed inset-0 z-50`, the entire viewport, above ordinary
  page content, and a dead layer left in the DOM can still occupy that space — this is what a
  real report of "the page goes white with a broken-image icon after resizing, but the assistant
  widget (`z-80`, above this layer) still works" turned out to be, confirmed by forcibly losing
  the context (`WEBGL_lose_context`) and checking `document.elementFromPoint`: before the fix, the
  point resolved to the dead canvas; the real page content underneath was completely intact the
  whole time. `handleContextLost` now sets `canvas.style.display = "none"`, so the canvas is fully
  out of layout, paint and hit-testing rather than merely idle. There is no `webglcontextrestored`
  handler and `preventDefault()` is deliberately not called in the loss handler — every buffer this
  component owns is already gone by the time the loop stops, so reinitializing in place is the same
  amount of work as a fresh mount, and treating the loss as permanent is the honest description of
  what actually happened. The cursor is decoration; the page it decorates keeps working.
- **`PIXEL_RATIO_CAP` is a prop**, defaulting to the upstream's fixed 2, and `CursorLayer` sets it
  to 1. At `deviceScaleFactor: 2` and a 1637×936 viewport that takes the drawing buffer from
  3274×1872 (6.13M pixels shaded per frame) to 1637×936 (1.53M). This is a per-frame cost saving
  on retina displays only — it does nothing on a `deviceScaleFactor: 1` monitor, and it was not
  what caused the crash above. The same wrapper also lowers `DYE_RESOLUTION` to 512,
  `PRESSURE_ITERATIONS` to 12 and `SIM_RESOLUTION` to 96; the reasoning is in its own comment.

Simple transitions use CSS instead of introducing ChaoUi's animation dependency. Financial amounts
are rendered directly, not animated through intermediate values.

## From Chaos Market AI

That project is a market-analysis terminal; SealPay is a settlement terminal. The design language
carries over so the two read as one family, but every value SealPay displays is re-derived from
its own data.

| Chaos Market AI reference | SealPay adaptation |
| --- | --- |
| `components/chaos/chaos-sphere.tsx` | `src/components/chaos/ChaosSphere.tsx`: the dot-matrix sphere — canvas 2D, Fibonacci lattice, depth fade, LED ramp. Adds a `MutationObserver` on the `dark` class, because SealPay has a theme toggle and the palette is resolved from CSS tokens once per run of the render effect |
| `lib/analysis/pulse.ts` | `src/lib/visual/pulse.ts`: `heartbeat()` unchanged; `derivePulse` rewritten to map a settlement stage to a rate instead of market structure |
| `lib/utils/css-color.ts` | `src/lib/visual/css-color.ts`: unchanged — both projects build tokens on `color-mix()`, which canvas cannot parse |
| `lib/visual/led-ring.ts` | folded into `src/lib/visual/pulse.ts` as `rampStops` |
| `chaos-panel`, `-label`, `-metric`, `-number`, `-badge`, `-divider`, `-trace-row` | `src/components/chaos/Terminal.tsx`: one file holding `Panel`, `Label`, `Metric`, `Num`, `Divider`, `TraceRow`, `Chip` and `StatusDot` |
| `chaos-grid`, `chaos-dot-field`, `chaos-scanlines`, `chaos-cut` | `src/app/globals.css`, same rules |
| `styles/tokens.css` | `src/styles/tokens.css`: the same Happy Hues 13 accents, extended with a light mode |

### What the sphere means here

Chaos Market AI prints `DERIVED, NOT PREDICTED` under its pulse. SealPay keeps that label and
earns it the same way. `derivePulse` maps one observable stage of a transfer — offline, idle,
drafting, review, signing, settling, settled, failed — to one fixed rate, so the same stage always
beats the same way. Amplitude comes from the browser-local confirmed-payment count, and the single
travelling ripple fires once per settled payment. None of it is random, and none of it is a
forecast.

`SettlementPath` in `src/components/payments/SettlementPulse.tsx` renders the five stages
`PaymentStudio` actually moves a transfer through, so the numbering stops advancing exactly when
the payment does.

## Visual direction

A settlement terminal: one flat ground, hairline rules instead of shadows, square corners instead
of radii, and a single warm accent. Colour is never decoration — the accent marks the one action on
screen that spends money, and positive/negative are reserved for settled and reverted.

- **Palette** — [Happy Hues](https://www.happyhues.co/) 13 (`#0f0e17` ink, `#fffffe` paper,
  `#a7a9be` muted, `#ff8906` accent), the same set Chaos Market AI runs on. Tokens live in
  `src/styles/tokens.css`.
- **Type** — Geist Sans for prose, Geist Mono for everything the reader scans character by
  character: addresses, hashes, amounts, chain ids and all metadata labels. The previous design had
  one family at one weight scale and no typographic contrast at all.
- **Theme** — dark is the default and the designed state; light is the same terminal printed on
  paper, and is a deliberate opt-out rather than an OS preference.
- **Motion** — transform and opacity only. The sphere stops rendering off-screen through an
  `IntersectionObserver` and paints one resting frame under reduced motion.

The retired lavender/coral token names are kept as aliases onto the new set, so any component still
referencing `--brand-coral` or `--accent-violet` resolves into the restrained palette rather than
breaking.

## Routes

- `/`: public landing page
- `/dashboard`: wallet balance, saved counts, settlement pulse, recent activity, faucet onboarding
- `/pay`: send/request with separate drafts and review-before-signing
- `/requests`: request builder and browser-local saved requests
- `/checkout?to=…&amount=…&memo=…&ref=…`: compact shared payment flow
- `/history`: wallet-scoped browser records, pending-status checks, downloadable records

Legacy market/swap/pool/portfolio routes are retained; no legacy storage is deleted. Old swap demo
entries are intentionally not represented as real Arc payment receipts.

## Payment safeguards and limitations

- Amounts must be positive with at most six decimals; invalid input is rejected, not rounded.
- Full non-zero recipient address validation; recipient query strings are never silently truncated.
- Review snapshots sender, recipient and amount, with a gas estimate plus 20% buffer.
- Arc's native 18-decimal and ERC-20 6-decimal views represent the same USDC asset. Native
  balance is checked against transfer plus estimated fee; the views are never added together.
- After switching networks, sender and chain are checked again before requesting a signature.
- Submitted hashes are saved as Pending before waiting for a receipt. A timeout is not treated
  as a failed transfer; use Activity → Check status or ArcScan, and do not blindly resend.
- Requests, memos and references are not signed invoices or onchain metadata. Shared URLs are
  editable and disclose their contents. Verify the recipient out of band.
- Browser storage is capped at 200 payments and 200 requests. It is not an indexer, backup,
  accounting ledger, cross-device sync or automatic paid/unpaid reconciliation.
- Automated transaction tests use an injected mock wallet and mocked Arc RPC. A small actual
  Arc Testnet transfer must still be tested manually before public release.

## Move to a separate repository

Copy source, public assets, tests, docs, package manifests/lockfile, framework configs and
`.env.example` into the new folder. Do not copy `.git`, `.next`, `node_modules`, `.env.local`,
test outputs or private keys. Initialize Git there; this upgrade does not change the existing
repository's remote or publish anything. Review ownership/licensing of inherited assets before
making the new repository public. Run `npm ci`, lint, unit tests, browser tests and build again.
