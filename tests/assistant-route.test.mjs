import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) return next(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href))
    return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { POST } = await import("../src/app/api/chat/route.ts");
const walletAddress = "0x3333333333333333333333333333333333333333";

test("route executes the planned read, returns evidence and passes matching results to explanation", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test-key-not-sent";
  const modelRequests = [];
  const rpcMethods = [];
  globalThis.fetch = async (input, options) => {
    const url = String(input instanceof Request ? input.url : input);
    const body = JSON.parse(options?.body ?? (input instanceof Request ? await input.text() : "{}"));
    if (url.startsWith("https://rpc.testnet.arc.io")) {
      rpcMethods.push(body.method);
      const result = body.method === "eth_blockNumber" ? "0x10" : `0x${(123456789n).toString(16).padStart(64, "0")}`;
      return Response.json({ jsonrpc: "2.0", id: body.id, result });
    }
    assert.ok(url.startsWith("https://generativelanguage.googleapis.com/"), "Unexpected external call");
    modelRequests.push(body);
    if (modelRequests.length === 1) return Response.json({
      id: "plan", status: "requires_action", steps: [{ type: "function_call", id: "balance-call", name: "getBalance", arguments: {} }],
    });
    return new Response('data: {"event_type":"step.delta","index":0,"delta":{"type":"text","text":"Balance checked."}}\n\n', {
      headers: { "Content-Type": "text/event-stream" },
    });
  };
  try {
    const response = await POST(new Request("http://localhost/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, messages: [{ role: "user", content: "My balance?" }] }),
    }));
    assert.equal(response.status, 200);
    const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    assert.equal(events.find(event => event.type === "evidence").evidence.rows.find(row => row.label === "Balance").value, "123.456789 USDC");
    assert.ok(events.some(event => event.type === "text" && event.text === "Balance checked."));
    assert.equal(events.at(-1).type, "done");
    assert.deepEqual(rpcMethods, ["eth_blockNumber", "eth_call"]);
    assert.equal(modelRequests.length, 2);
    assert.equal(modelRequests[0].store, false);
    assert.equal(modelRequests[1].store, false);
    assert.equal(modelRequests[1].generation_config.tool_choice, "none");
    const result = modelRequests[1].input.find(step => step.type === "function_result");
    assert.equal(result.call_id, "balance-call");
    assert.equal(JSON.parse(result.result).source, "Arc Testnet RPC");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
