# ChaoUi → SealPay workspace

The workspace takes selected interaction patterns from the user's existing ChaoUi library
at `C:\Users\mrcha\Desktop\Genlayer\AI\ChaoUi`. That source directory was not modified.
Components are adapted locally; there is no runtime import from that machine-specific path.

| ChaoUi reference | SealPay adaptation |
| --- | --- |
| `navigation/dashboard-sidebar/DashboardSidebar.tsx` | `src/components/layout/DashboardSidebar.tsx`: collapsible, route-aware sidebar using Next links |
| `navigation/animated-tabs/AnimatedTabs.tsx` | `src/components/chaos/AnimatedTabs.tsx`: sliding indicator, controlled tabs, keyboard arrows/Home/End and ARIA relationships |
| `loaders/progress-bar/ProgressBar.tsx` | `src/components/chaos/ProgressBar.tsx`: accessible pending/complete transaction progress |

Simple transitions use CSS instead of introducing ChaoUi's animation dependency. Financial
amounts are rendered directly, not animated through intermediate values. Reduced-motion
preferences are respected. Dashboard cards and the perforated payment preview are composed
in HTML/CSS, using the existing shared Card/Button components.

## Visual direction

Color roles follow [Happy Hues](https://www.happyhues.co/): lavender background, plum text,
coral actions, yellow highlights. Shared tokens live in `src/app/globals.css`. Interactive text
uses a darker coral for contrast in light mode. Both light and dark modes remain supported.

## Routes

- `/`: public landing page
- `/dashboard`: wallet balance, saved counts, recent activity, faucet onboarding
- `/pay`: send/request with separate drafts and review-before-signing
- `/requests`: request builder and browser-local saved requests
- `/checkout?to=…&amount=…&memo=…&ref=…`: compact shared payment flow
- `/history`: wallet-scoped browser records, pending-status checks, downloadable records

Legacy market/swap/pool/portfolio routes are retained; no legacy storage is deleted. Old swap
demo entries are intentionally not represented as real Arc payment receipts.

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
