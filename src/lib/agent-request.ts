import { parseUnits, type Address, type Hash } from "viem";
import { ARC_USDC_ADDRESS } from "./arc";
import { draftErrors, paymentLink, USDC_DECIMALS, validatePayment } from "./payments";
import { directInvoiceIdFor, memoHashFor } from "./registry";

/** The same ceilings the payment form enforces on its inputs. */
const MEMO_MAX = 120;
const REFERENCE_MAX = 48;

/** Direct invoices have the top bit of their id set; see `directInvoiceIdFor`. */
const DIRECT_ID = /^0x[89a-f][0-9a-f]{63}$/;

export type AgentRequest = {
  /** The UUID carried in the link; the on-chain key is derived from it. */
  id: string;
  /** Poll `GET /api/request/<invoiceId>` with this. */
  invoiceId: Hash;
  url: string;
  to: Address;
  amount: string;
  memo: string;
  reference: string;
};

export type AgentRequestResult =
  | { ok: true; request: AgentRequest }
  | { ok: false; code: string; message: string };

const fail = (code: string, message: string): AgentRequestResult => ({ ok: false, code, message });

/**
 * Builds a payment link for an agent from the terms it supplied.
 *
 * Nothing is stored and nothing is signed. The invoice id is a function of the
 * terms and a fresh UUID, so whoever later pays the link settles exactly that
 * id on chain, and the id is all a poller needs to read the outcome back.
 *
 * Memo and reference are rejected rather than truncated: the contract commits
 * to their exact text, and a link that silently shortened them would not match
 * what the agent thinks it asked for.
 */
export function createAgentRequest(origin: string, body: unknown, newId: () => string = () => crypto.randomUUID()): AgentRequestResult {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return fail("invalid_body", "Send a JSON object with `to` and `amount`.");

  const { to, amount, memo = "", reference = "" } = body as Record<string, unknown>;
  for (const [name, value] of Object.entries({ to, amount, memo, reference }))
    if (typeof value !== "string") return fail("invalid_field", `\`${name}\` must be a string.`);

  if ((memo as string).length > MEMO_MAX) return fail("invalid_field", `\`memo\` is limited to ${MEMO_MAX} characters.`);
  if ((reference as string).length > REFERENCE_MAX)
    return fail("invalid_field", `\`reference\` is limited to ${REFERENCE_MAX} characters.`);

  const draft = {
    to: (to as string).trim(),
    amount: (amount as string).trim(),
    memo: memo as string,
    reference: (reference as string) || `SP-${newId().slice(0, 8).toUpperCase()}`,
  };
  const errors = draftErrors(draft);
  const message = errors.to ?? errors.amount;
  if (message) return fail("invalid_field", message);

  const valid = validatePayment(draft);
  const id = newId();
  const invoiceId = directInvoiceIdFor({
    requestId: id,
    issuer: valid.to,
    token: ARC_USDC_ADDRESS,
    amount: parseUnits(valid.amount, USDC_DECIMALS),
    memoHash: memoHashFor(valid.memo, valid.reference),
  });
  return {
    ok: true,
    request: { id, invoiceId, url: paymentLink(origin, valid, id), to: valid.to, amount: valid.amount, memo: valid.memo, reference: valid.reference },
  };
}

export function isDirectInvoiceId(value: string): value is Hash {
  return DIRECT_ID.test(value.toLowerCase());
}
