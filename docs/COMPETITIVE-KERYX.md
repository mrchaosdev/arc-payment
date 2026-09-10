# Keryx comparison and gap list

A review of [keryx.cc](https://keryx.cc) / [tang-vu/keryx](https://github.com/tang-vu/keryx),
another Arc-testnet project, against ChaosPay. Sources: the live site, the repository README,
`PLAN.md`, and `DECISIONS.md`, read on 2026-09-09. Keryx ships continuously, so its numbers
below are a snapshot; its `/proof` page carries the current ones.

## The two are not the same product

| | ChaosPay | Keryx |
| --- | --- | --- |
| What it is | Non-custodial USDC payment app: send, request, receipt | Citation-toll AI reading agent that buys sources and pays their authors |
| Who uses it | A person paying another person | Autonomous agents, and the creators they cite |
| Arc's role | One ERC-20 transfer per payment | Batched sub-cent nanopayments, continuous volume |
| Origin | Arc testnet MVP | Lepton Agents hackathon (Canteen × Circle), June 2026, still running |

Feature-for-feature ranking is therefore misleading. What is comparable is the depth of the
payment infrastructure underneath, and there Keryx is substantially further along.

## What Keryx has that ChaosPay does not

**Server tier and durable storage.** ChaosPay is entirely client-side: `src/lib/payments.ts` is
24 lines of validation and link building, `src/lib/arc.ts` is 13 lines of constants, and there
are no API routes. Keryx runs SQLite (dev) / Supabase (prod) behind a `lib/db` adapter, with a
`payment_events` table, an on-chain event indexer, and hourly rotating off-box backups.

**x402 per-request payment.** Keryx uses `@circle-fin/x402-batching` in a two-toll design — a
fixed access price to read a source, plus a dynamic citation reward weighted by contribution.
ChaosPay calls the USDC `transfer()` function directly, one transaction per payment.

**Circle Gateway and App Kit.** Batched settlement down to a $0.000001 floor, and a
chain-abstracted treasury balance published at `/api/treasury` for anyone to audit. Both appear
in ChaosPay's README only as future milestones.

**An on-chain contract.** `SourceRegistry` at `0x2e12Fa3256B21b9d8726933b5c4bfBDCc740e536`
holds creator identity, IPFS CIDs, and multi-author splits; payees are checked against the chain
rather than the database before anything settles. ChaosPay deploys no contract.

**Session wallet with worker-held keys.** The user funds a session EOA whose key is derived
inside a Web Worker and never returned to the page; it signs only to registry-authorised payees
and only to USDC/Gateway. The residual risks are written down in `docs/security-threat-model.md`.
ChaosPay stops at RainbowKit plus a per-transaction signature.

**Distribution surfaces.** Remote MCP over Streamable HTTP plus a published `keryx-mcp` npm
package, an OpenAI-compatible `/api/v1` endpoint, an agent-to-agent `POST /api/agent/ask`,
a Chromium extension, Discord/Telegram/Slack commands, an Atom feed of answers, and an
embeddable creator badge SVG. ChaosPay has five web routes.

**Public operational proof.** `/proof`, `/status`, `/api/health`, and `/api/activity` expose
uptime, the deployed commit, settlement mode, and live traction. The reported snapshot is 9,505
settled nanopayments and $44.97 of volume — with an explicit note that most of it comes from
Keryx's own agents rather than outside users, which is the right way to report it.

**Test and deploy discipline.** CI runs an economic-invariant suite (spend ≤ budget,
payouts = weights, splits sum exactly) on every push. Deploys build beside the live process,
swap atomically, health-gate, and roll back on failure. ChaosPay has one 27-line unit test file
and Playwright end-to-end tests against a mock wallet and RPC.

**Reusable primitives.** The building blocks are extracted into a separate MIT-licensed
repository, `keryx-arc-primitives`, and vendored back as a submodule.

## Where ChaosPay still stands up

- Narrow, legible scope. The whole product explains itself in a paragraph.
- Honest documentation of its own limits: memos are not written onchain, history and requests
  are browser-local, and browser tests do not prove live settlement. That framing should survive
  any of the work below.
- Honest labels sit directly on the dashboard cards ("not a paid/unpaid count", "Not a full
  onchain history") rather than on a separate proof page, and the landing page carries a
  "What this is not" panel instead of burying its limits in a doc.
- Art direction. Screenshots taken on 2026-09-09 showed Keryx committed to a single look — flat
  cream ground, Didone display type, monospace metadata, oxblood and forest accents, a guilloché
  rule and a dispatch ticker, all matching its herald/toll/ledger vocabulary — while ChaosPay was
  competent default fintech: gradient wash, rounded cards, one geometric sans at one weight scale,
  no typographic contrast. That gap was never a question of skill; the author's own
  [Chaos Market AI](https://agen-ai-wmxi.vercel.app/) already had a committed art direction.
  ChaosPay has since been rebuilt on that same language — see
  [the interface sources](CHAOUI-ADAPTATION.md) — so the comparison now is between two terminals
  rather than between a terminal and a template.

## Gap list, ordered by return

1. **Onchain reconciliation for `/requests`.** Saved requests have no automatic paid/unpaid
   state. Reading USDC `Transfer` logs filtered by recipient closes this with no server tier.
2. **Storage beyond `localStorage`.** History and requests are lost on a device change, and are
   capped at 200 each. This is the largest current limitation.
3. **x402 or Gateway integration.** The one Circle-tooling capability the project scores nothing
   on today.
4. **A `/status` page and health endpoint.** Cheap, and usually the first thing a reviewer opens.
5. **A small contract.** The invoice/escrow idea already named in the README roadmap, after the
   security review that entry calls for.

Items 1 and 4 are achievable without changing the current architecture.
