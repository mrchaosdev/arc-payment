/**
 * The landing page's "What this is not" panel and the docs page both print this
 * list. One array so the two cannot drift apart the way a second hand-copied
 * version eventually would.
 *
 * Message keys rather than sentences: both callers translate them at render
 * time, and the wording lives in `src/messages/*.json` under `limits`.
 */
export const CHAOSPAY_LIMIT_KEYS = ["l1", "l2", "l3", "l4", "l5", "l6"] as const;
