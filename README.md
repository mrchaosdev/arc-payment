# ChaosPay

ChaosPay is a non-custodial USDC payment MVP built for the Arc public testnet. It lets users:

- connect an EVM wallet with RainbowKit;
- switch safely to Arc Testnet;
- send USDC through its 6-decimal ERC-20 interface;
- create shareable payment-request links, with a QR code for paying from a phone;
- save pending and confirmed payment records with ArcScan links in local browser storage;
- print or save a receipt as PDF for any recorded payment;
- keep named recipient contacts in the browser; and
- ask a grounded assistant about ChaosPay, Arc and its own reads.

The navigation bar carries the live USDC balance, the current network with a switch button when the
wallet is elsewhere, and a badge for payments still awaiting a receipt.

## Local development

Requirements: Node.js 22.18 or newer and npm (the unit tests use native TypeScript stripping).

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The payment workspace is at
[http://localhost:3000/dashboard](http://localhost:3000/dashboard). Send payments at `/pay`,
create and revisit links at `/requests`, open shared links at `/checkout`, keep recipients at
`/contacts`, and check receipts at `/history`.

### Environment variables

| Variable | Side | Needed at | Without it |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | server | runtime | The assistant hides itself; everything else works |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | client | **build** | Only injected wallets (MetaMask); phone wallets cannot connect |
| `COINGECKO_API_KEY` | server | — | Nothing. No code reads it yet; the token list keeps CoinGecko ids for a future price view |

`NEXT_PUBLIC_*` values are inlined into the bundle by `next build`, so setting one at runtime has no
effect — it must be present when the app is built. See [docs/handover.md](docs/handover.md) for the
deployment steps and the traps that follow from this.

## Test an Arc payment

1. Connect a test wallet.
2. Get testnet USDC from the [Circle Faucet](https://faucet.circle.com).
3. Open `/pay`, enter a recipient and amount, review the recipient/amount/estimated fee in the app, then sign in your wallet.
4. Confirm the receipt on [ArcScan](https://testnet.arcscan.app).

Arc Testnet configuration:

| Field | Value |
| --- | --- |
| Chain ID | `5042002` (`0x4CEF52`) |
| RPC | `https://rpc.testnet.arc.network` |
| Explorer | `https://testnet.arcscan.app` |
| USDC ERC-20 | `0x3600000000000000000000000000000000000000` |
| USDC decimals | `6` |

Arc exposes one USDC balance through native and ERC-20 views. ChaosPay uses the 6-decimal ERC-20
interface for display and transfers and does not add the native view to it.

## Checks

```bash
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

## Current scope

This is a public-testnet MVP, not a production payment processor. Payment memos and references are
encoded only in the editable shared URL/local receipt; they are not written onchain. History and
requests are local to this browser, capped at 200 each, with no automatic paid/unpaid reconciliation.
Browser tests use a mock wallet/RPC and do not prove live-network settlement. Future milestones can
add CCTP funding, Circle Gateway unified balances, embedded wallets, merchant webhooks, and an
optional invoice/escrow contract after security review.

[The handover notes](docs/handover.md) carry the current state, the project map, the non-obvious
traps found while building it, and the open work in the order it is worth doing. The assistant's
read semantics and privacy boundary are in [docs/payment-assistant.md](docs/payment-assistant.md),
and interface class names in [docs/css-classes.md](docs/css-classes.md).

[The Keryx comparison](docs/COMPETITIVE-KERYX.md) reviews another Arc-testnet project against this
one and lists the resulting gaps in the order they are worth closing.

Resources: [Arc](https://www.arc.io), [Arc docs](https://docs.arc.io), and
[Circle developer docs](https://developers.circle.com).

## UI and a future standalone repo

The interface is a settlement terminal: flat ground, hairline rules, square corners, one warm
accent, and Geist Mono on every address, hash and amount. It adapts components from the ChaoUi
library and shares its design language — including the dot-matrix pulse sphere and a landing-only
fluid cursor that follows the viewport — with Chaos Market AI. Neither source folder is imported at runtime. See
[the interface sources and migration notes](docs/CHAOUI-ADAPTATION.md) for component origins,
what the sphere is derived from, payment safeguards, how the WebGL effect is bounded, and what to copy when creating a separate
repository.
