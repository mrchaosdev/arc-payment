import { test, expect } from "@playwright/test";
import type { Address, Hex } from "viem";
import { answerCall, arcTxUrl, isArcRpc, ARC_CHAIN_ID_HEX, blockAt, transferLog } from "./arc-mock";

const payee = "0x3333333333333333333333333333333333333333" as Address;
const payer = "0x1111111111111111111111111111111111111111" as Address;
const paidHash = `0x${"77".repeat(32)}` as Hex;

/** Fixed so the transfer provably lands after the request was created. */
const CREATED_AT = 1_700_000_000_000;
const BLOCK = 500;
const BLOCK_SECONDS = 1_700_000_100;
const HEAD = 10_000;

const request = (id: string, amount: string, reference: string) => ({
  id, to: payee, amount, memo: "", reference, createdAt: CREATED_AT,
});

/**
 * Connects the wallet that both requests are payable to, and lets the chain
 * answer with exactly one incoming transfer.
 */
async function workspace(page: import("@playwright/test").Page) {
  await page.addInitScript(({ payee, requests, arcChainId }) => {
    localStorage.setItem("chaospay-workspace-v1", JSON.stringify({ version: 0, state: { payments: [], requests } }));
    const listeners: Record<string, ((data: unknown) => void)[]> = {};
    Object.assign(window, { ethereum: {
      isMetaMask: true, isConnected: () => true,
      on: (event: string, fn: (data: unknown) => void) => { (listeners[event] ??= []).push(fn); },
      removeListener: (event: string, fn: (data: unknown) => void) => { listeners[event] = listeners[event]?.filter(item => item !== fn); },
      request: async ({ method }: { method: string }) => {
        if (method === "eth_chainId") return arcChainId;
        if (method === "eth_accounts") return sessionStorage.getItem("reconcile-authorized") ? [payee] : [];
        if (method === "eth_requestAccounts") { sessionStorage.setItem("reconcile-authorized", "1"); return [payee]; }
        if (method === "wallet_getPermissions" || method === "wallet_requestPermissions") {
          sessionStorage.setItem("reconcile-authorized", "1");
          return [{ parentCapability: "eth_accounts" }];
        }
        if (method === "eth_getBalance") return "0x0";
        throw new Error(`Unexpected wallet action: ${method}`);
      },
    } });
  }, { payee, requests: [request("r-paid", "12.5", "INV-PAID"), request("r-open", "40", "INV-OPEN")], arcChainId: ARC_CHAIN_ID_HEX as string });

  await page.route(isArcRpc, async route => {
    const payload = route.request().postDataJSON();
    const reply = (rpc: { id: number; method: string; params?: unknown }) => {
      let result: unknown = null;
      if (rpc.method === "eth_chainId") result = ARC_CHAIN_ID_HEX;
      else if (rpc.method === "eth_getBalance") result = "0x0";
      else if (rpc.method === "eth_blockNumber") result = `0x${HEAD.toString(16)}`;
      else if (rpc.method === "eth_call") result = answerCall(rpc.params);
      else if (rpc.method === "eth_getBlockByNumber") result = blockAt(BLOCK, BLOCK_SECONDS);
      else if (rpc.method === "eth_getLogs") {
        // Only the chunk that actually covers the block returns the transfer, so
        // the test exercises the sweep's paging rather than papering over it.
        const [filter] = rpc.params as [{ fromBlock: Hex; toBlock: Hex }];
        const covers = Number(BigInt(filter.fromBlock)) <= BLOCK && BLOCK <= Number(BigInt(filter.toBlock));
        result = covers ? [transferLog({ from: payer, to: payee, units: BigInt(12_500_000), block: BLOCK, hash: paidHash })] : [];
      }
      return { jsonrpc: "2.0", id: rpc.id, result };
    };
    await route.fulfill({ json: Array.isArray(payload) ? payload.map(reply) : reply(payload) });
  });

  await page.goto("/pay");
  await page.getByRole("button", { name: "Connect wallet to continue" }).click();
  await page.getByRole("button", { name: "Browser Wallet" }).click();
  await expect(page.getByRole("button", { name: "Wallet details", exact: true })).toBeVisible();
}

test("an exact incoming transfer settles the request it paid, and only that one", async ({ page }) => {
  await workspace(page);
  await page.goto("/requests");

  const paid = page.locator(".saved-requests-item").filter({ hasText: "INV-PAID" });
  const open = page.locator(".saved-requests-item").filter({ hasText: "INV-OPEN" });

  await expect(paid.getByText("Paid", { exact: true })).toBeVisible();
  await expect(paid).toContainText("0x111...1111");
  // The receipt is a link to a transfer that is on chain, not a status the app invented.
  await expect(paid.locator(".saved-requests-settled-explorer")).toHaveAttribute(
    "href",
    arcTxUrl(paidHash),
  );
  // A cleared request stops offering its link, so it cannot be paid twice.
  await expect(paid.getByRole("button", { name: "Copy link" })).toHaveCount(0);

  await expect(open.getByText("Paid", { exact: true })).toHaveCount(0);
  await expect(open.getByRole("button", { name: "Copy link" })).toBeVisible();

  await expect(page.locator(".saved-requests-panel")).toContainText("1/2 PAID");
});

test("a settled request stays settled across a reload, and says how far it looked", async ({ page }) => {
  await workspace(page);
  await page.goto("/requests");
  await expect(page.locator(".saved-requests-panel")).toContainText("1/2 PAID");

  await page.reload();
  await expect(page.locator(".saved-requests-item").filter({ hasText: "INV-PAID" }).getByText("Paid", { exact: true })).toBeVisible();
  // The cursor is the honest statement of how current an unpaid request is.
  await expect(page.locator(".saved-requests-cursor")).toBeVisible();
});
