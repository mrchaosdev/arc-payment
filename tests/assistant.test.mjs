import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { TransactionNotFoundError, TransactionReceiptNotFoundError, encodeAbiParameters, encodeEventTopics, erc20Abi } from "viem";

// Node's TS stripping needs an extension; app imports are resolved by Next/TS.
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href))
    return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { runPaymentTool } = await import("../src/lib/assistant/tools.ts");
const { readAssistantStream } = await import("../src/lib/assistant/protocol.ts");
const from = "0x3333333333333333333333333333333333333333";
const to = "0x1111111111111111111111111111111111111111";
const hash = `0x${"ab".repeat(32)}`;
const token = "0x3600000000000000000000000000000000000000";
const context = { walletAddress: from, userText: `Estimate 1.25 USDC to ${to}. Check ${hash}` };
const value = (result, label) => result.rows.find(row => row.label === label)?.value;
function rpc(overrides = {}) {
  return {
    getBlockNumber: async () => 16n,
    readContract: async () => 123456789n,
    getBalance: async () => 100n * 10n ** 18n,
    getGasPrice: async () => 20_000_000_000n,
    estimateContractGas: async () => 50_000n,
    getTransactionReceipt: async () => ({ status: "success", blockNumber: 16n, gasUsed: 50_000n, effectiveGasPrice: 20_000_000_000n, logs: [] }),
    getTransaction: async () => ({ blockNumber: null }),
    ...overrides,
  };
}

test("reads exact balance at a recorded block and emits source metadata", async () => {
  const result = await runPaymentTool("getBalance", {}, context, rpc({ readContract: async args => {
    assert.equal(args.blockNumber, 16n);
    assert.equal(args.address, token);
    assert.deepEqual(args.args, [from]);
    return 123456789n;
  } }));
  assert.equal(value(result, "Balance"), "123.456789 USDC");
  assert.equal(result.source, "Arc Testnet RPC");
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
  assert.equal(result.url, `https://testnet.arcscan.app/address/${from}`);
});

test("missing or invented addresses, extra params, unknown tools fail before RPC", async () => {
  const noRpc = new Proxy({}, { get() { assert.fail("RPC must not run"); } });
  for (const [name, args, ctx] of [
    ["getBalance", {}, { userText: "balance?" }],
    ["getBalance", { address: to }, { userText: "balance?" }],
    ["getBalance", { rpcUrl: "https://example.com" }, context],
    ["sendTransaction", {}, context],
    ["getTransactionStatus", { hash: hash + "ab" }, context],
    ["getTransactionStatus", { hash }, { userText: "status?" }],
    ["estimatePayment", { to, amount: "1.0000001" }, context],
  ]) assert.equal((await runPaymentTool(name, args, ctx, noRpc)).ok, false);
});

test("estimates exact ERC20 transfer and applies fee buffer using integer math", async () => {
  const result = await runPaymentTool("estimatePayment", { to, amount: "1.25" }, context, rpc({ estimateContractGas: async args => {
    assert.equal(args.account, from);
    assert.equal(args.functionName, "transfer");
    assert.deepEqual(args.args, [to, 1250000n]);
    return 50000n;
  } }));
  assert.equal(value(result, "Estimated fee (20% buffer)"), "0.0012 USDC");
  assert.equal(value(result, "Estimated total"), "1.2512 USDC");
  assert.match(value(result, "Result"), /Enough/);
});

test("balance covering amount but not buffered fee is insufficient", async () => {
  const result = await runPaymentTool("estimatePayment", { to, amount: "1.25" }, context, rpc({ getBalance: async () => 12501n * 10n ** 14n }));
  assert.match(value(result, "Result"), /Insufficient/);
});

test("insufficient amount does not invent a fee or run a doomed simulation", async () => {
  const result = await runPaymentTool("estimatePayment", { to, amount: "1.25" }, context, rpc({
    getBalance: async () => 0n,
    estimateContractGas: async () => assert.fail("No simulation"),
  }));
  assert.match(value(result, "Result"), /Insufficient/);
  assert.equal(value(result, "Estimated fee (20% buffer)"), undefined);
});

test("receipt success is not proof of a USDC transfer without the right token log", async () => {
  const result = await runPaymentTool("getTransactionStatus", { hash }, context, rpc());
  assert.match(value(result, "Status"), /Confirmed transaction/);
  assert.match(value(result, "Transfer evidence"), /No USDC Transfer/);
});

test("decodes amount and parties only from USDC Transfer events", async () => {
  const result = await runPaymentTool("getTransactionStatus", { hash }, context, rpc({ getTransactionReceipt: async () => ({
    status: "success", blockNumber: 16n, gasUsed: 50000n, effectiveGasPrice: 20000000000n,
    logs: [{ address: token, topics: encodeEventTopics({ abi: erc20Abi, eventName: "Transfer", args: { from, to } }), data: encodeAbiParameters([{ type: "uint256" }], [1250000n]) }],
  }) }));
  assert.equal(value(result, "USDC transfer"), `1.25 USDC: ${from} → ${to}`);
});

test("pending, unknown, reverted and RPC failures stay distinct", async () => {
  const noReceipt = async () => { throw new TransactionReceiptNotFoundError({ hash }); };
  const pending = await runPaymentTool("getTransactionStatus", { hash }, context, rpc({ getTransactionReceipt: noReceipt }));
  assert.match(value(pending, "Status"), /Pending/);
  const unknown = await runPaymentTool("getTransactionStatus", { hash }, context, rpc({ getTransactionReceipt: noReceipt, getTransaction: async () => { throw new TransactionNotFoundError({ hash }); } }));
  assert.match(value(unknown, "Status"), /Not found/);
  const failed = await runPaymentTool("getTransactionStatus", { hash }, context, rpc({ getTransactionReceipt: async () => ({ status: "reverted", blockNumber: 16n, gasUsed: 1n, effectiveGasPrice: 1n, logs: [] }) }));
  assert.match(value(failed, "Status"), /Reverted/);
  const unavailable = await runPaymentTool("getTransactionStatus", { hash }, context, rpc({ getTransactionReceipt: async () => { throw new Error("secret RPC details"); } }));
  assert.equal(unavailable.ok, false);
  assert.equal(value(unavailable, "Status"), undefined);
  assert.doesNotMatch(JSON.stringify(unavailable), /secret RPC/);
});

test("JSON stream preserves Vietnamese split mid-byte and evidence before errors", async () => {
  const events = [{ type: "text", text: "Số dư" }, { type: "evidence", evidence: { title: "Balance" } }, { type: "error", text: "Retry" }, { type: "done" }];
  const bytes = new TextEncoder().encode(events.map(event => JSON.stringify(event)).join("\n"));
  const stream = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); } });
  const actual = [];
  await readAssistantStream(stream, event => actual.push(event));
  assert.deepEqual(actual, events);
});

test("truncated stream is reported, not mistaken for a complete answer", async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"type":"text","text":"Partial"}\n')); controller.close(); } });
  await assert.rejects(readAssistantStream(stream, () => {}), /interrupted/);
});
