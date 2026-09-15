import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href))
    return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { ARC, ARC_NETWORKS, resolveArcNetwork } = await import("../src/lib/arc.ts");

test("an unset NEXT_PUBLIC_ARC_NETWORK builds against testnet", () => {
  assert.equal(ARC.key, "testnet");
  assert.equal(ARC.chainId, 5_042_002);
  assert.equal(ARC.isTestnet, true);
});

test("mainnet carries the one value Circle has settled and guesses none of the rest", () => {
  const mainnet = ARC_NETWORKS.mainnet;
  assert.equal(mainnet.chainId, 5_042);
  assert.equal(mainnet.isTestnet, false);
  // Every unpublished field stays null. An address copied from testnet would
  // send real money to whatever lives at that system address on mainnet.
  for (const field of ["rpcUrl", "explorerUrl", "usdc", "eurc", "swapChain"])
    assert.equal(mainnet[field], null, field);
  assert.notEqual(mainnet.usdc, ARC_NETWORKS.testnet.usdc);
});

test("resolving an incomplete network throws and names every missing field", () => {
  assert.throws(() => resolveArcNetwork(ARC_NETWORKS.mainnet), err => {
    for (const field of ["rpcUrl", "explorerUrl", "usdc", "eurc", "swapChain"])
      assert.match(err.message, new RegExp(field));
    return true;
  });
});

test("a single missing field is enough to refuse the network", () => {
  const almost = { ...ARC_NETWORKS.testnet, key: "mainnet", usdc: null };
  assert.throws(() => resolveArcNetwork(almost), /usdc/);
  // And a complete one resolves to itself rather than being rebuilt.
  assert.equal(resolveArcNetwork(ARC_NETWORKS.testnet).chainId, 5_042_002);
});
