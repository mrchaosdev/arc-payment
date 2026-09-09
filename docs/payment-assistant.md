# Payment assistant

The assistant can read USDC balances, estimate a USDC transfer, and inspect an Arc Testnet transaction. It has no signing or sending tool.

## Data flow

1. The browser sends the question and conversation text. A public wallet address is included only when the user enables **Use connected wallet**. Switching wallets does not automatically share the new address.
2. Gemini selects from `getBalance`, `estimatePayment`, and `getTransactionStatus`. Missing addresses, recipients, amounts, or hashes should trigger a clarification.
3. The server validates the tool arguments and reads the fixed Arc Testnet RPC. Addresses and hashes must come from user messages or the explicitly shared wallet. There is no arbitrary URL or RPC method parameter.
4. The server returns evidence with a source, check time, exact amounts, and an ArcScan link. The UI renders it independently of model prose.
5. Gemini explains the results. Tool calls are disabled for this final explanation. Both model requests use `store: false`.

The model integration follows [Gemini's function-calling interface](https://ai.google.dev/gemini-api/docs/function-calling), using stateless input steps and matched function result IDs.

## Read semantics

- Balance reads record a block number and use USDC's 6 decimal places.
- Estimates use integer arithmetic, a 20% gas buffer, and the same rounding helpers as the payment review. Balance reads and simulation use the recorded block; gas price is a current estimate. The wallet still reviews the final fee.
- A transaction can be confirmed, reverted, pending, included without a receipt, or not found. RPC failure is a separate error. Unknown does not mean failed.
- Only decoded Transfer logs from the configured USDC contract are reported as transfer evidence. A successful transaction by itself is not proof that the intended recipient was paid.
- Check time is when the read completed, not the transaction's timestamp. Old cards are snapshots; ask again for a new read.
- Browser history, saved requests and form contents are not included in chat. Shared questions, addresses and read results are processed by the AI provider. This is testnet USDC, without monetary value.

## Configuration and validation

Uses the existing server-side `GEMINI_API_KEY`. No Binance key or wallet key is needed. The RPC endpoint comes from `src/lib/arc.ts`.

Each answer allows at most three reads. RPC calls have a 5-second timeout and no retry; each model call has an 18-second timeout. The existing per-instance request limit still applies.

Run `npm test` for exact amounts, evidence, failure states and stream handling. Run `npm run test:e2e -- tests/e2e/assistant.spec.ts` for the widget. Unit tests mock RPC and browser tests mock AI; neither proves live model availability or live settlement.

## CSS classes

New controls and evidence use single-hyphen names:

- `assistant-wallet-context`, `assistant-wallet-label`, `assistant-wallet-checkbox`, `assistant-context-notice`
- `assistant-read-status`
- `assistant-evidence`, `assistant-evidence-title`, `assistant-evidence-rows`, `assistant-evidence-row`
- `assistant-evidence-label`, `assistant-evidence-value`, `assistant-evidence-source`, `assistant-evidence-time`, `assistant-evidence-link`
