import { test, expect, type Page } from "@playwright/test";
import { decodeFunctionData, erc20Abi } from "viem";

const sender = "0x3333333333333333333333333333333333333333";
const recipient = "0x1111111111111111111111111111111111111111";
const hash = `0x${"ab".repeat(32)}`;

async function wallet(page: Page, { pending = false, reject = false } = {}) {
  await page.addInitScript(({ sender, hash, reject }) => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const transactions: unknown[] = [];
    // addInitScript re-runs on every navigation, so a plain closure variable would forget
    // authorization the moment the test navigates to /history. sessionStorage survives
    // navigations within the same tab (like a real wallet's remembered permission) while
    // still resetting for the next test's fresh context.
    const isAuthorized = () => sessionStorage.getItem("e2e-wallet-authorized") === "1";
    const authorize = () => sessionStorage.setItem("e2e-wallet-authorized", "1");
    Object.assign(window, { testTransactions: transactions, ethereum: {
      isMetaMask: true, isConnected: () => true,
      on: (event: string, callback: (...args: unknown[]) => void) => { (listeners[event] ??= []).push(callback); },
      removeListener: (event: string, callback: (...args: unknown[]) => void) => { listeners[event] = listeners[event]?.filter(fn => fn !== callback); },
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        if (method === "eth_chainId") return "0x4cef52";
        // Real wallets only expose accounts via eth_accounts after the site has been
        // granted permission; returning them unconditionally would make wagmi auto-reconnect
        // on load and skip the "Connect wallet" step this test flow depends on.
        if (method === "eth_accounts") return isAuthorized() ? [sender] : [];
        if (method === "eth_requestAccounts") { authorize(); return [sender]; }
        if (method === "wallet_getPermissions" || method === "wallet_requestPermissions") { authorize(); return [{ parentCapability: "eth_accounts" }]; }
        if (method === "eth_sendTransaction") {
          if (reject) throw Object.assign(new Error("User rejected the request"), { code: 4001 });
          transactions.push(params?.[0]); return hash;
        }
        if (method === "wallet_switchEthereumChain" || method === "wallet_addEthereumChain") return null;
        if (method === "eth_blockNumber") return "0x10";
        if (method === "eth_getBalance") return "0x56bc75e2d63100000";
        throw Object.assign(new Error(`Unsupported method ${method}`), { code: 4200 });
      },
    } });
  }, { sender, hash, reject });
  await page.route("https://rpc.testnet.arc.network/**", async route => {
    const payload = route.request().postDataJSON();
    const answer = (rpc: { id: number; method: string }) => {
      const values: Record<string, unknown> = {
        eth_chainId: "0x4cef52", eth_blockNumber: "0x10", eth_gasPrice: "0x4a817c800", eth_estimateGas: "0xc350",
        eth_getBalance: "0x56bc75e2d63100000", eth_call: `0x${(100000000n).toString(16).padStart(64, "0")}`,
        eth_getTransactionCount: "0x0",
        eth_getTransactionReceipt: pending ? null : {
          transactionHash: hash, transactionIndex: "0x0", blockHash: `0x${"cd".repeat(32)}`, blockNumber: "0x10",
          from: sender, to: "0x3600000000000000000000000000000000000000", cumulativeGasUsed: "0xc350", gasUsed: "0xc350",
          effectiveGasPrice: "0x4a817c800", contractAddress: null, logs: [], logsBloom: `0x${"0".repeat(512)}`, status: "0x1", type: "0x2",
        },
      };
      return { jsonrpc: "2.0", id: rpc.id, result: values[rpc.method] ?? null };
    };
    await route.fulfill({ json: Array.isArray(payload) ? payload.map(answer) : answer(payload) });
  });
  await page.goto("/pay");
  await page.getByRole("button", { name: "Connect wallet to continue" }).click();
  await page.getByRole("button", { name: "Browser Wallet" }).click();
  await expect(page.getByRole("button", { name: "Review payment", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Recipient address", exact: true }).fill(recipient);
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("1.25");
  await page.getByRole("button", { name: "Review payment", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review your payment" })).toBeVisible();
}

test("review locks exact transfer data, confirms once and persists receipt", async ({ page }) => {
  await wallet(page);
  await expect(page.getByRole("textbox", { name: "Recipient address", exact: true })).toHaveCount(0);
  // The payer is told what actually leaves the wallet, not two numbers to add up.
  await expect(page.getByText("Total from your wallet").first()).toBeVisible();
  await page.getByRole("button", { name: "Confirm & pay" }).click();
  await expect(page.getByRole("heading", { name: "Payment complete" })).toBeVisible();
  const transactions = await page.evaluate(() => (window as unknown as { testTransactions: { to: string; data: `0x${string}` }[] }).testTransactions);
  expect(transactions).toHaveLength(1);
  expect(transactions[0].to.toLowerCase()).toBe("0x3600000000000000000000000000000000000000");
  const decoded = decodeFunctionData({ abi: erc20Abi, data: transactions[0].data });
  expect(decoded.functionName).toBe("transfer");
  expect(decoded.args).toEqual([recipient, 1250000n]);
  await page.goto("/history");
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByText("1.25 USDC", { exact: true })).toBeVisible();
});

test("wallet rejection returns to review without recording a payment", async ({ page }) => {
  await wallet(page, { reject: true });
  await page.getByRole("button", { name: "Confirm & pay" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "declined in your wallet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review your payment" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("sealpay-workspace-v1") || '{"state":{"payments":[]}}').state.payments)).toHaveLength(0);
});

test("submitted payment is stored before confirmation and survives reload", async ({ page }) => {
  await wallet(page, { pending: true });
  await page.getByRole("button", { name: "Confirm & pay" }).click();
  await expect(page.getByRole("heading", { name: "Waiting for confirmation" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("sealpay-workspace-v1") || '{"state":{"payments":[]}}').state.payments[0]?.status)).toBe("Pending");
  await page.goto("/history");
  // Everything in this list has already been signed and broadcast, so the open
  // question is the receipt rather than the signature.
  await expect(page.getByText("Awaiting receipt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Check status" }).click();
  await expect(page.getByRole("status")).toContainText("Receipt not available yet");
});

test("a completed payment does not leave the next one prefilled", async ({ page }) => {
  await wallet(page);
  await page.getByRole("button", { name: "Confirm & pay" }).click();
  await expect(page.getByRole("heading", { name: "Payment complete" })).toBeVisible();

  await page.getByRole("button", { name: "New payment" }).click();
  await expect(page.getByRole("textbox", { name: "Recipient address", exact: true })).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "Amount", exact: true })).toHaveValue("");
});

test("repeating a payment is a separate, deliberate action", async ({ page }) => {
  await wallet(page);
  await page.getByRole("button", { name: "Confirm & pay" }).click();
  await expect(page.getByRole("heading", { name: "Payment complete" })).toBeVisible();

  await page.getByRole("button", { name: "Send again to this recipient" }).click();
  await expect(page.getByRole("textbox", { name: "Recipient address", exact: true })).toHaveValue(recipient);
  await expect(page.getByRole("textbox", { name: "Amount", exact: true })).toHaveValue("1.25");
  // Repeating still has to pass back through review and a fresh signature.
  await expect(page.getByRole("button", { name: "Confirm & pay" })).toHaveCount(0);
});

test("a bad address is reported at the field, before review is attempted", async ({ page }) => {
  await wallet(page);
  await page.getByRole("button", { name: "Edit payment" }).click();
  const to = page.getByRole("textbox", { name: "Recipient address", exact: true });
  await to.fill("0x123");
  await page.getByRole("textbox", { name: "Amount", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "valid, non-zero recipient" })).toBeVisible();
  await expect(to).toHaveAttribute("aria-invalid", "true");

  // Pressing on anyway puts the cursor back where the problem is.
  await page.getByRole("button", { name: "Review payment", exact: true }).click();
  await expect(to).toBeFocused();
  await expect(page.getByRole("heading", { name: "Review your payment" })).toHaveCount(0);
});
