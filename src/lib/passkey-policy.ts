/**
 * Rules for the passkey wallet that do not need a browser, kept apart from the
 * connector so they can be tested without WebAuthn.
 */

/**
 * Whether a Circle client key can serve this network.
 *
 * Circle issues `TEST_` keys for testnets and `LIVE_` keys for mainnets, and a
 * key used on the other kind fails at the first bundler call with an opaque
 * authorization error. Offering the passkey wallet only when the two agree
 * keeps that failure out of the connect dialog entirely.
 */
export function clientKeyServes(key: string | undefined, isTestnet: boolean) {
  const value = key?.trim();
  if (!value) return false;
  return value.startsWith(isTestnet ? "TEST_" : "LIVE_");
}

/**
 * Whether a failed sponsored user operation should be retried unsponsored.
 *
 * Gas sponsorship needs a Gas Station policy in Circle Console, and one may not
 * exist (it is optional on testnet). The paymaster answers before the passkey
 * is asked to sign, so retrying without it costs no second prompt. On Arc the
 * account then pays its own gas in USDC, which it already holds to pay at all.
 *
 * A passkey prompt the user dismissed is never retried: they said no.
 */
export function shouldRetryUnsponsored(error: unknown) {
  const text = errorText(error);
  if (/NotAllowedError|user (cancel|reject|denied)|aborted/i.test(text)) return false;
  return /paymaster|sponsor|policy|gas station|AA3[0-9]/i.test(text);
}

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (typeof error !== "object") return String(error);
  const parts: string[] = [];
  for (const key of ["name", "message", "shortMessage", "details"] as const) {
    const value = (error as Record<string, unknown>)[key];
    if (typeof value === "string") parts.push(value);
  }
  const cause = (error as { cause?: unknown }).cause;
  if (cause && cause !== error) parts.push(errorText(cause));
  return parts.join(" ");
}

/** A WebAuthn user name for a new passkey: unique, and recognisable in the OS passkey picker. */
export function passkeyUsername(now = new Date(), random = Math.random) {
  const day = now.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.floor(random() * 36 ** 4).toString(36).padStart(4, "0");
  return `chaospay-${day}-${suffix}`;
}
