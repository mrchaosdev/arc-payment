# ChaosPay

ChaosPay is a non-custodial USDC payment MVP built for the Arc network. It lets users:

- connect an EVM wallet with RainbowKit;
- switch safely to Arc mainnet (Arc Testnet is still supported — see below);
- send USDC through its 6-decimal ERC-20 interface;
- create shareable payment-request links, with a QR code for paying from a phone;
- save pending and confirmed payment records with ArcScan links in local browser storage;
- see a saved request marked paid when a matching USDC transfer reaches it on Arc;
- print or save a receipt as PDF for any recorded payment;
- keep named recipient contacts in the browser; and
- swap between the Circle stablecoins Arc carries, through Circle's Swap Kit;
- read the interface in English, Vietnamese, Simplified Chinese or Russian; and
- ask a grounded assistant about ChaosPay, Arc and its own reads.

## Deployment target

ChaosPay is deployed on **Arc mainnet** at [chaospayment.xyz](https://chaospayment.xyz).
Arc mainnet has been live since 2026-09-16.

The network is chosen by `NEXT_PUBLIC_ARC_NETWORK` (`mainnet` or `testnet`), which Next.js inlines
at build time. `.env.local` currently sets `mainnet`, so `npm run dev` runs against **mainnet too** —
with real USDC. Set it to `testnet` if you want a throwaway network locally.

## Local development

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

## Make an Arc payment

1. Connect a wallet.
2. Fund it with USDC. **Mainnet USDC does not come from a faucet** — bring it in from a bridge, an
   exchange or a DEX. Circle's faucet mints testnet USDC only.
3. Open `/pay`, enter a recipient and amount, review the recipient/amount/estimated fee in the app,
   then sign in your wallet.
4. Confirm the receipt on [ArcScan](https://explorer.arc.io).

Arc mainnet configuration (what this build targets):

| Field | Value |
| --- | --- |
| Chain ID | `5042` (`0x13B2`) |
| RPC | `https://rpc.blockdaemon.mainnet.arc.io` |
| Explorer | `https://explorer.arc.io` |
| USDC ERC-20 | `0x3600000000000000000000000000000000000000` |
| EURC ERC-20 | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` |
| Decimals | `6` for both |

Arc mainnet carries USDC and EURC and no USDT; Circle's Swap Kit routes that same pair. cirBTC is a
testnet-only token, and several impostor contracts on mainnet reuse all three symbols — see the
warning at the top of `src/lib/tokenlist/tokens.ts`.

Arc Testnet configuration, if `NEXT_PUBLIC_ARC_NETWORK=testnet`:

| Field | Value |
| --- | --- |
| Chain ID | `5042002` (`0x4CEF52`) |
| RPC | `https://rpc.testnet.arc.io` |
| Explorer | `https://testnet.arcscan.app` |

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
requests are local to this browser, capped at 200 each. A saved request is marked paid by an
exact-amount match found while the app is open, within a bounded window of recent blocks; the
requests page prints how far it has looked rather than implying "unpaid" means unpaid.
Browser tests use a mock wallet/RPC and do not prove live-network settlement. Future milestones can
add CCTP funding, Circle Gateway unified balances, embedded wallets, merchant webhooks, and an
optional invoice/escrow contract after security review.

[The roadmap](docs/roadmap.md) carries where the project is going and why — the product it is
becoming, the four architectural decisions that follow from it, and what is deliberately not being
built. [The handover notes](docs/handover.md) carry the current state, the project map, the non-obvious
traps found while building it, and the open work in the order it is worth doing. The assistant's
read semantics and privacy boundary are in [docs/payment-assistant.md](docs/payment-assistant.md),
and interface class names in [docs/css-classes.md](docs/css-classes.md).

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
