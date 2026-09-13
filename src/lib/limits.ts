/**
 * The landing page's "What this is not" panel and the docs page both print
 * this list. One array so the two can't drift apart the way a second
 * hand-copied version eventually would.
 */
export const CHAOSPAY_LIMITS: string[] = [
  "A public-testnet MVP, not a production payment processor.",
  "Memos and references live in the link and the local receipt. They are not written onchain.",
  "History and saved requests are stored in this browser, capped at 200 each.",
  "A request is marked paid only by an exact-amount match found while this app is open. A payment that lands while it is closed for long is not seen, and the requests page prints how far it has looked.",
  "The assistant sends your question, and any address you choose to share, to the AI provider. It has no tool that signs or sends.",
  "Browser tests run against a mock wallet and RPC. They do not prove live settlement.",
];
