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
| `cursor/splash-cursor/SplashCursor.tsx` | `src/components/chaos/SplashCursor.tsx`: the WebGL fluid simulation carried over verbatim; only the three imports are repointed and the file is marked `"use client"` |
| `hooks/useInView`, `hooks/useMediaQuery` | `src/hooks/`: `useMediaQuery` is rewritten onto `useSyncExternalStore`, because the effect-based original trips React's set-state-in-effect rule |

`src/components/chaos/CursorLayer.tsx` wraps the splash cursor: `RAINBOW_MODE` is off and the
colour is pinned to the interface accent, and it renders nothing under `prefers-reduced-motion`
(the upstream component opts out on coarse pointers but not on reduced motion).

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
