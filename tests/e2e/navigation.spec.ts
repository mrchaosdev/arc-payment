import { test, expect, type Page } from "@playwright/test";
import { decodeFunctionData, encodeFunctionResult, type Hex } from "viem";

// wagmi batches contract reads through Multicall3, so a mock that answers
// `eth_call` with a bare uint256 makes viem fail to decode and the balance query
// retry forever. Arc Testnet really does have Multicall3 at this address, so the
// mock has to speak aggregate3 rather than the app avoid it.
const MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11";
const BALANCE = `0x${BigInt(100000000).toString(16).padStart(64, "0")}` as Hex;

const aggregate3Abi = [
  {
    type: "function",
    name: "aggregate3",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;

/** Every read in these tests is a balance, so each batched call gets the same answer. */
function answerCall(params: unknown): Hex {
  const [call] = params as [{ to?: string; data: Hex }];
  if (call?.to?.toLowerCase() !== MULTICALL3) return BALANCE;
  const { args } = decodeFunctionData({ abi: aggregate3Abi, data: call.data });
  const calls = args[0] as readonly unknown[];
  return encodeFunctionResult({
    abi: aggregate3Abi,
    functionName: "aggregate3",
    result: calls.map(() => ({ success: true, returnData: BALANCE })),
  });
}

const sender = "0x3333333333333333333333333333333333333333";
const recipient = "0x1111111111111111111111111111111111111111";
const hash = `0x${"ab".repeat(32)}`;

async function wallet(page: Page, { wrongNetwork = false, pending = false } = {}) {
  await page.addInitScript(({ sender, recipient, hash, wrongNetwork, pending }) => {
    let chain = wrongNetwork ? "0x1" : "0x4cef52";
    const listeners: Record<string, ((data: unknown) => void)[]> = {};
    if (pending) localStorage.setItem("chaospay-workspace-v1", JSON.stringify({ version: 0, state: { requests: [], payments: [
      { hash, from: sender, to: recipient, amount: "1.25", memo: "", reference: "", createdAt: Date.now(), status: "Pending" },
      { hash: `0x${"cd".repeat(32)}`, from: recipient, to: sender, amount: "9", memo: "", reference: "", createdAt: Date.now(), status: "Pending" },
    ] } }));
    Object.assign(window, { ethereum: {
      isMetaMask: true, isConnected: () => true,
      on: (event: string, fn: (data: unknown) => void) => { (listeners[event] ??= []).push(fn); },
      removeListener: (event: string, fn: (data: unknown) => void) => { listeners[event] = listeners[event]?.filter(item => item !== fn); },
      request: async ({ method, params }: { method: string; params?: { chainId: string }[] }) => {
        if (method === "eth_chainId") return chain;
        if (method === "eth_accounts") return sessionStorage.getItem("nav-authorized") ? [sender] : [];
        if (method === "eth_requestAccounts") { sessionStorage.setItem("nav-authorized", "1"); return [sender]; }
        if (method === "wallet_getPermissions" || method === "wallet_requestPermissions") { sessionStorage.setItem("nav-authorized", "1"); return [{ parentCapability: "eth_accounts" }]; }
        if (method === "wallet_switchEthereumChain") { chain = params![0].chainId; listeners.chainChanged?.forEach(fn => fn(chain)); return null; }
        if (method === "eth_getBalance") return "0x0";
        throw new Error(`Unexpected wallet action: ${method}`);
      },
    } });
  }, { sender, recipient, hash, wrongNetwork, pending });
  let settled = false;
  await page.route(/https:\/\/(rpc\.testnet\.arc\.io|cloudflare-eth\.com)/, async route => {
    const payload = route.request().postDataJSON();
    const reply = (rpc: { id: number; method: string; params?: unknown }) => ({ jsonrpc: "2.0", id: rpc.id, result: ({
      eth_chainId: "0x4cef52", eth_getBalance: "0x0", eth_blockNumber: "0x10",
      eth_call: answerCall(rpc.params),
      eth_getTransactionReceipt: settled ? {
        transactionHash: hash, transactionIndex: "0x0", blockHash: `0x${"ef".repeat(32)}`, blockNumber: "0x10", from: sender,
        to: "0x3600000000000000000000000000000000000000", cumulativeGasUsed: "0xc350", gasUsed: "0xc350",
        effectiveGasPrice: "0x4a817c800", contractAddress: null, logs: [], logsBloom: `0x${"0".repeat(512)}`, status: "0x1", type: "0x2",
      } : null,
    } as Record<string, unknown>)[rpc.method] ?? null });
    await route.fulfill({ json: Array.isArray(payload) ? payload.map(reply) : reply(payload) });
  });
  await page.goto("/pay");
  await page.getByRole("button", { name: "Connect wallet to continue" }).click();
  await page.getByRole("button", { name: "Browser Wallet" }).click();
  await expect(page.getByRole("button", { name: "Wallet details", exact: true })).toContainText("100 USDC");
  return () => { settled = true; };
}

test("navbar exposes exact Arc balance, copy address and switches a supported non-Arc network", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await wallet(page, { wrongNetwork: true });
  await page.getByRole("button", { name: "Switch to Arc", exact: true }).click();
  await expect(page.locator(".top-bar-network-status")).toHaveText("Arc Testnet");
  await page.getByRole("button", { name: "Wallet details", exact: true }).click();
  const panel = page.locator(".top-bar-wallet-popover");
  await expect(panel).toBeVisible();
  await expect(panel.getByText(sender, { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Copy address" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(sender);
  await expect(panel.getByRole("link", { name: "ArcScan" })).toHaveAttribute("href", `https://testnet.arcscan.app/address/${sender}`);
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
});

test("pending badge scopes to the connected wallet and clears after a receipt", async ({ page }) => {
  const settle = await wallet(page, { pending: true });
  await page.getByRole("button", { name: "1 pending payments" }).click();
  await expect(page.locator(".top-bar-pending-popover")).toContainText("1.25 USDC");
  await expect(page.locator(".top-bar-pending-popover")).not.toContainText("9 USDC");
  settle();
  await expect(page.getByRole("button", { name: "1 pending payments" })).toHaveCount(0, { timeout: 15_000 });
  await expect(page.locator(".top-bar-pending-empty")).toBeVisible();
});

test("wallet controls and popovers fit a 320px screen", async ({ page }, testInfo) => {
  await wallet(page, { pending: true });
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.getByRole("button", { name: "Wallet details", exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: "1 pending payments" })).toBeInViewport();
  await page.getByRole("button", { name: "Wallet details", exact: true }).click();
  await expect(page.locator(".top-bar-wallet-popover")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("navigation-mobile.png"), fullPage: true });
});

test("contacts persist, reject duplicates, edit, prefill payment and remove", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Linh");
  await page.getByRole("textbox", { name: "Wallet address", exact: true }).fill(recipient);
  await page.getByRole("button", { name: "Save contact", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Contact saved.");
  await page.reload();
  const row = page.locator(".contacts-item").filter({ hasText: "Linh" });
  await expect(row).toBeVisible();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Duplicate");
  await page.getByRole("textbox", { name: "Wallet address", exact: true }).fill(recipient);
  await page.getByRole("button", { name: "Save contact", exact: true }).click();
  // Scoped: Next's dev overlay also carries role="alert", so a bare role query
  // is ambiguous in dev mode.
  await expect(page.locator(".contacts-error")).toContainText("already in your contacts");
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Linh Design");
  await page.getByRole("button", { name: "Save changes" }).click();
  await row.getByRole("link", { name: "Send USDC" }).click();
  await expect(page.getByRole("textbox", { name: "Recipient address", exact: true })).toHaveValue(recipient);
  await page.getByRole("textbox", { name: "Recipient address", exact: true }).fill("");
  await page.getByRole("combobox", { name: "Saved recipient" }).selectOption(recipient);
  await expect(page.getByRole("textbox", { name: "Recipient address", exact: true })).toHaveValue(recipient);
  await page.goto("/contacts");
  await row.getByRole("button", { name: "Remove", exact: true }).click();
  await row.getByRole("button", { name: "Confirm removal" }).click();
  await expect(row).toHaveCount(0);
});

test("sidebar opens assistant and retains shortcuts when collapsed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard");
  const sidebar = page.locator(".dashboard-sidebar-root");
  await sidebar.getByRole("button", { name: "Ask assistant" }).click();
  await expect(page.getByRole("region", { name: "ChaosPay assistant" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your question" })).toBeFocused();
  await page.getByRole("button", { name: "Close the assistant" }).click();
  await sidebar.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(sidebar.getByRole("link", { name: "Send USDC" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Contacts", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Get test USDC" })).toHaveAttribute("href", "https://faucet.circle.com");
});
