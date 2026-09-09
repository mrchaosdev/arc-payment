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
| `media/morph-slider/MorphSlider.tsx` | `src/components/layout/ThemeMorphToggle.tsx` + `src/app/globals.css`: its melt gesture is applied to old/new whole-page theme snapshots without the image slider's WebGL runtime |
| `cursor/splash-cursor/SplashCursor.tsx` | `src/components/chaos/SplashCursor.tsx`: the WebGL fluid simulation, scoped to the landing route with the safeguards below |
| `hooks/useInView`, `hooks/useMediaQuery` | `src/hooks/`: visibility, coarse-pointer and reduced-motion gates used by the cursor |
| `media/accordion-gallery/AccordionGallery.tsx` | `src/components/chaos/CapabilityAccordion.tsx`: the expand-on-hover mechanic (one GSAP timeline, `flexGrow` driving the growing panel), rebuilt for text — see below |

Simple transitions use CSS instead of introducing ChaoUi's animation dependency. Financial amounts
are rendered directly, not animated through intermediate values.

### The capability accordion — what stayed, what didn't

Upstream's `AccordionGallery` is a photo gallery: a row of panels, one growing on hover to reveal an
image with 3D tilt, parallax drift and a grayscale-to-colour fade. The landing page's six
capability cards have no photos, so the port keeps only the mechanic and drops everything that
mechanic existed to serve:

- **Kept.** One `gsap.timeline()` built fresh per active-index change, `flexGrow` driving the
  growing panel, hover/focus/click all setting the same state, arrow-key navigation, a
  reduced-motion check before every run.
- **Dropped.** `perspective`/`rotateY` tilt, image parallax drift, the grayscale filter — all
  photographic, and the tilt specifically would have been the one 3D transform on a page that is
  everywhere else deliberately flat (see "Visual direction" below: transform and opacity only,
  square corners, no depth). A collapsed panel shows its title as vertical text instead of a
  thumbnail.
- **Fixed, not carried over.** Upstream's keyboard handler computes `active + 1` from the DOM
  element that has focus, but never moves focus to the new active panel — so a second ArrowRight
  computes `current + 1` from the same starting point instead of advancing from where the first
  press landed. Confirmed with Playwright before and after: two ArrowRight presses from panel 0
  reached panel 1 both times upstream-style, panel 2 once focus follows `active`.
- **Responsive.** Upstream escapes to a stacked vertical layout under 520px via CSS overrides on
  the JS-set inline styles. This port takes the same approach at this project's own `md` breakpoint
  (768px) instead of an arbitrary pixel width, and `applyLayout` skips its `ResizeObserver` work
  entirely below it rather than computing a layout nothing will read.

### The splash cursor — landing-only and budgeted

The first port mounted a `fixed inset-0 z-50` simulation in `AppShell`, so it ran forever on every
route. Testing exposed a GPU memory leak during resize (230 textures over 30 resizes) and a dead
full-screen layer after WebGL context loss. The component keeps the fixes: replaced framebuffers
are explicitly disposed, effect cleanup deletes every owned GPU resource without forcing context
loss on a reusable canvas, and a real context loss stops and hides the canvas.

The current integration is deliberately smaller. `ArcHome` dynamically loads it for the landing
route only. Its fixed viewport canvas follows the reader through the meta bar, hero, capabilities
and details, sits above the landing sections but below persistent controls, and never receives
pointer events. It opts out on coarse
pointers and `prefers-reduced-motion`, pauses when the tab is hidden, and stops requesting frames
2.4 seconds after the latest interaction. Retina DPR is capped at 1, dye resolution at 512, the
simulation grid at 96, and the pressure solve at 12 passes. The cursor cycles through its rainbow
palette. It is not rendered by `AppShell`, so dashboard, payment and checkout routes carry none of
its runtime cost.

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
| `styles/tokens.css` | `src/styles/tokens.css`: Happy Hues 13 for dark mode and Happy Hues 17 for light mode |

### What the sphere means here

Chaos Market AI prints `DERIVED, NOT PREDICTED` under its pulse. SealPay keeps that label and
earns it the same way. `derivePulse` maps one observable stage of a transfer — offline, idle,
drafting, review, signing, settling, settled, failed — to one fixed rate, so the same stage always
beats the same way. Amplitude comes from the browser-local confirmed-payment count, and the single
travelling ripple fires once per settled payment. None of it is random, and none of it is a
forecast.

Dark mode keeps the original sphere ramp and depth fade. Light mode mixes the palette's pink and
cyan toward navy, raises the back-point opacity and minimum dot size, and draws a navy outer ring;
this also keeps the 62px assistant launcher legible on the cream background.

`SettlementPath` in `src/components/payments/SettlementPulse.tsx` renders the five stages
`PaymentStudio` actually moves a transfer through, so the numbering stops advancing exactly when
the payment does.

## Visual direction

A settlement terminal: one flat ground, hairline rules instead of shadows, and square corners
instead of radii. Dark mode keeps its warm action accent; light mode uses pink for actions and cyan
as a supporting hue. Positive/negative remain reserved for settled and reverted.

- **Palette** — dark uses [Happy Hues 13](https://www.happyhues.co/palettes/13)
  (`#0f0e17` ink, `#ff8906` accent). Light uses [Happy Hues 17](https://www.happyhues.co/palettes/17)
  (`#fef6e4` ground, `#001858` ink, `#f3d2c1` surface, `#8bd3dd` secondary and `#f582ae` action).
  Tokens live in `src/styles/tokens.css`.
- **Type** — Geist Sans for prose, Geist Mono for everything the reader scans character by
  character: addresses, hashes, amounts, chain ids and all metadata labels. The previous design had
  one family at one weight scale and no typographic contrast at all.
- **Theme** — dark remains the default; light is a warmer companion theme selected explicitly by
  the user rather than inferred from the OS preference.
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
