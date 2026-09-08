# SealPay

SealPay is a non-custodial USDC payment MVP built for the Arc public testnet. It lets users:

- connect an EVM wallet with RainbowKit;
- switch safely to Arc Testnet;
- send USDC through its 6-decimal ERC-20 interface;
- create shareable payment-request links; and
- save pending and confirmed payment records with ArcScan links in local browser storage.

The original market, swap, pool, and portfolio experiments remain available as secondary routes.

## Local development

Requirements: Node.js 22.18 or newer and npm (the unit tests use native TypeScript stripping).

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The payment workspace is at
[http://localhost:3000/dashboard](http://localhost:3000/dashboard). Send payments at `/pay`,
create and revisit links at `/requests`, open shared links at `/checkout`, and check receipts at `/history`.

`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is optional for injected wallets such as MetaMask, but a
real Reown project ID is required for WalletConnect. `COINGECKO_API_KEY` is optional and is used only
by the legacy market-data routes.

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

Arc exposes one USDC balance through native and ERC-20 views. SealPay uses the 6-decimal ERC-20
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

[The Keryx comparison](docs/COMPETITIVE-KERYX.md) reviews another Arc-testnet project against this
one and lists the resulting gaps in the order they are worth closing.

Resources: [Arc](https://www.arc.io), [Arc docs](https://docs.arc.io), and
[Circle developer docs](https://developers.circle.com).

## UI and a future standalone repo

The interface is a settlement terminal: flat ground, hairline rules, square corners, one warm
accent, and Geist Mono on every address, hash and amount. It adapts components from the ChaoUi
library and shares its design language — including the dot-matrix pulse sphere and the splash
cursor — with Chaos Market AI. Neither source folder is imported at runtime. See
[the interface sources and migration notes](docs/CHAOUI-ADAPTATION.md) for component origins,
what the sphere is derived from, payment safeguards and what to copy when creating a separate
repository.
