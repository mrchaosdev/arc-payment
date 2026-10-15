import { test } from "node:test";
import assert from "node:assert/strict";

const { clientKeyServes, passkeyUsername, shouldRetryUnsponsored } = await import("../src/lib/passkey-policy.ts");

test("a client key serves only the kind of network it was issued for", () => {
  assert.equal(clientKeyServes("TEST_CLIENT_KEY:abc:def", true), true);
  assert.equal(clientKeyServes("TEST_CLIENT_KEY:abc:def", false), false);
  assert.equal(clientKeyServes("LIVE_CLIENT_KEY:abc:def", false), true);
  assert.equal(clientKeyServes("LIVE_CLIENT_KEY:abc:def", true), false);
  assert.equal(clientKeyServes("  TEST_CLIENT_KEY:abc  ", true), true);
  assert.equal(clientKeyServes("", true), false);
  assert.equal(clientKeyServes(undefined, false), false);
});

test("a missing sponsorship is retried unsponsored, a refusal by the user is not", () => {
  assert.equal(shouldRetryUnsponsored(new Error("Paymaster policy not found for this client key")), true);
  assert.equal(shouldRetryUnsponsored({ shortMessage: "Request failed", details: "AA33 reverted (or OOG)" }), true);
  assert.equal(shouldRetryUnsponsored({ message: "outer", cause: { message: "gas station is not enabled" } }), true);

  const cancelled = Object.assign(new Error("The operation either timed out or was not allowed."), { name: "NotAllowedError" });
  assert.equal(shouldRetryUnsponsored(cancelled), false);
  assert.equal(shouldRetryUnsponsored(new Error("User rejected the request.")), false);
  // Anything else is a real failure, and retrying would only hide it.
  assert.equal(shouldRetryUnsponsored(new Error("AA21 didn't pay prefund")), false);
  assert.equal(shouldRetryUnsponsored(new Error("execution reverted: ERC20: transfer amount exceeds balance")), false);
  assert.equal(shouldRetryUnsponsored(undefined), false);
});

test("a new passkey gets a dated, distinct user name", () => {
  const day = new Date("2026-10-16T08:00:00Z");
  assert.equal(passkeyUsername(day, () => 0), "chaospay-20261016-0000");
  assert.match(passkeyUsername(day, () => 0.5), /^chaospay-20261016-[0-9a-z]{4}$/);
  assert.notEqual(passkeyUsername(day, () => 0.1), passkeyUsername(day, () => 0.9));
});
