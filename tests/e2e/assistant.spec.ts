import { test, expect, type Page } from "@playwright/test";

/** Answer the widget's request without involving the model provider. */
async function stubAssistant(
  page: Page,
  { body, status = 200, delayMs = 0 }: { body: string; status?: number; delayMs?: number }
) {
  await page.route("**/api/chat", async (route) => {
    // The widget's availability probe is a GET; only the answer is stubbed.
    if (route.request().method() !== "POST") return route.fallback();
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status,
      headers: { "Content-Type": status === 200 ? "text/plain; charset=utf-8" : "application/json" },
      body,
    });
  });
}

async function openPanel(page: Page) {
  await page.goto("/pay");
  await page.getByRole("button", { name: "Open the ChaosPay assistant" }).click();
  return page.getByRole("region", { name: "ChaosPay assistant" });
}

test("the launcher is the sphere, and a click on it reaches the button", async ({ page }) => {
  await page.goto("/pay");
  const launcher = page.getByRole("button", { name: "Open the ChaosPay assistant" });
  await expect(launcher).toBeVisible();
  // Space reserved is not the same as drawn.
  await expect(launcher.locator("canvas")).toBeVisible();

  // The sphere fills the button, so the click lands on its canvas. It only gets
  // through because the sphere is mounted non-interactive — with drag-to-spin on,
  // its own pointer handlers swallow this and the panel never opens.
  await launcher.click({ position: { x: 32, y: 32 } });
  await expect(page.getByRole("region", { name: "ChaosPay assistant" })).toBeVisible();
});

test("a suggestion streams an answer into the panel", async ({ page }) => {
  const answer = "Gas on Arc is paid in USDC, so there is no second token to buy first.";
  await stubAssistant(page, { body: answer });

  const panel = await openPanel(page);
  await expect(panel.getByText("Reads never send a payment.", { exact: false })).toBeVisible();

  await panel.getByRole("button", { name: "Why is the fee paid in USDC?" }).click();
  await expect(panel.getByText("Why is the fee paid in USDC?")).toBeVisible();
  await expect(panel.getByText(answer)).toBeVisible();
});

test("the panel sends the whole exchange and keeps its own turn order", async ({ page }) => {
  const sent: unknown[] = [];
  await page.route("**/api/chat", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    sent.push(JSON.parse(route.request().postData() ?? "{}"));
    await route.fulfill({ status: 200, headers: { "Content-Type": "text/plain" }, body: "Second answer." });
  });

  const panel = await openPanel(page);
  await panel.getByRole("textbox", { name: "Your question" }).fill("First question");
  await panel.getByRole("button", { name: "Send question" }).click();
  await expect(panel.getByText("Second answer.")).toBeVisible();

  await panel.getByRole("textbox", { name: "Your question" }).fill("Follow up");
  await panel.getByRole("button", { name: "Send question" }).click();
  await expect(panel.getByText("Second answer.")).toHaveCount(2);

  // The second request carries the first exchange and still ends on a user turn.
  const second = sent[1] as { messages: { role: string; content: string }[] };
  expect(sent[0]).not.toHaveProperty("walletAddress");
  expect(second.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  expect(second.messages[2].content).toBe("Follow up");
});

test("RPC evidence stays visible when explanation fails and on the next question", async ({ page }) => {
  const hash = `0x${"ab".repeat(32)}`;
  const evidence = {
    tool: "getTransactionStatus", title: "Transaction status", checkedAt: "2026-09-09T08:30:00.000Z",
    source: "Arc Testnet RPC", ok: true, url: `https://testnet.arcscan.app/tx/${hash}`,
    rows: [{ label: "Status", value: "Pending — no receipt yet" }],
  };
  let count = 0;
  await page.route("**/api/chat", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    count++;
    const payload = route.request().postDataJSON();
    expect(payload).not.toHaveProperty("walletAddress");
    expect(payload.messages.every((message: Record<string, unknown>) => !message.evidence)).toBe(true);
    const events = count === 1 ? [
      { type: "status", text: "Checking Arc Testnet…" }, { type: "evidence", evidence },
      { type: "error", text: "The explanation could not finish." }, { type: "done" },
    ] : [{ type: "text", text: "Please check again." }, { type: "done" }];
    await route.fulfill({ headers: { "Content-Type": "application/x-ndjson" }, body: events.map(event => JSON.stringify(event)).join("\n") + "\n" });
  });
  const panel = await openPanel(page);
  await expect(panel.getByRole("checkbox", { name: /Use connected wallet/ })).toBeDisabled();
  await panel.getByRole("textbox", { name: "Your question" }).fill(`Check ${hash}`);
  await panel.getByRole("button", { name: "Send question" }).click();
  await expect(panel.getByText("Pending — no receipt yet", { exact: true })).toBeVisible();
  await expect(panel.getByText("Source: Arc Testnet RPC")).toBeVisible();
  await expect(panel.locator("time")).toHaveAttribute("datetime", evidence.checkedAt);
  await expect(panel.getByRole("link", { name: "Verify on ArcScan" })).toHaveAttribute("href", evidence.url);
  await expect(panel.getByRole("alert")).toContainText("explanation could not finish");
  await panel.getByRole("textbox", { name: "Your question" }).fill("Try again");
  await panel.getByRole("button", { name: "Send question" }).click();
  await expect(panel.getByText("Please check again.")).toBeVisible();
  await expect(panel.getByText("Pending — no receipt yet", { exact: true })).toBeVisible();
});

test("connected wallet is shared only while the user enables it", async ({ page }) => {
  const address = "0x3333333333333333333333333333333333333333";
  await page.addInitScript(address => {
    let authorized = false;
    Object.assign(window, { ethereum: {
      isMetaMask: true, isConnected: () => true,
      on: () => {}, removeListener: () => {},
      request: async ({ method }: { method: string }) => {
        if (method === "eth_chainId") return "0x4cef52";
        if (method === "eth_accounts") return authorized ? [address] : [];
        if (method === "eth_requestAccounts") { authorized = true; return [address]; }
        if (method === "wallet_requestPermissions" || method === "wallet_getPermissions") { authorized = true; return [{ parentCapability: "eth_accounts" }]; }
        if (method === "eth_getBalance") return "0x0";
        throw new Error(`Unexpected wallet method: ${method}`);
      },
    } });
  }, address);
  await page.route("https://rpc.testnet.arc.io/**", async route => {
    const payload = route.request().postDataJSON();
    const reply = (rpc: { id: number; method: string }) => ({ jsonrpc: "2.0", id: rpc.id, result: rpc.method === "eth_call" ? `0x${"0".repeat(64)}` : "0x0" });
    await route.fulfill({ json: Array.isArray(payload) ? payload.map(reply) : reply(payload) });
  });
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/chat", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    sent.push(route.request().postDataJSON());
    await route.fulfill({ headers: { "Content-Type": "text/plain" }, body: `Answer ${sent.length}` });
  });
  await page.goto("/pay");
  await page.getByRole("button", { name: "Connect wallet to continue" }).click();
  await page.getByRole("button", { name: "Browser Wallet" }).click();
  await expect(page.getByRole("button", { name: "Review payment", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open the ChaosPay assistant" }).click();
  const panel = page.getByRole("region", { name: "ChaosPay assistant" });
  const sharing = panel.getByRole("checkbox", { name: /Use connected wallet/ });
  await expect(sharing).toBeEnabled();
  await expect(sharing).not.toBeChecked();
  for (const [index, shared] of [false, true, false].entries()) {
    await sharing.setChecked(shared);
    await panel.getByRole("textbox", { name: "Your question" }).fill("My balance?");
    await panel.getByRole("button", { name: "Send question" }).click();
    await expect(panel.getByText(`Answer ${index + 1}`, { exact: true })).toBeVisible();
    if (shared) expect(sent[index].walletAddress).toBe(address);
    else expect(sent[index]).not.toHaveProperty("walletAddress");
  }
});

test("a refused request surfaces the server's reason, not a blank bubble", async ({ page }) => {
  await stubAssistant(page, { status: 429, body: JSON.stringify({ error: "Too many questions at once." }) });

  const panel = await openPanel(page);
  await panel.getByRole("textbox", { name: "Your question" }).fill("Anything");
  await panel.getByRole("button", { name: "Send question" }).click();

  await expect(panel.getByRole("alert")).toContainText("Too many questions at once.");
  await expect(panel.getByText("Assistant", { exact: true })).toHaveCount(0);
});

test("a slow answer can be stopped", async ({ page }) => {
  await stubAssistant(page, { body: "Never seen.", delayMs: 20_000 });

  const panel = await openPanel(page);
  await panel.getByRole("textbox", { name: "Your question" }).fill("Something slow");
  await panel.getByRole("button", { name: "Send question" }).click();

  const stop = panel.getByRole("button", { name: "Stop" });
  await expect(stop).toBeVisible();
  await stop.click();
  await expect(stop).toHaveCount(0);
  await expect(panel.getByRole("alert")).toHaveCount(0);
});

test("the route rejects malformed conversations before reaching a model", async ({ request }) => {
  const cases: [string, unknown][] = [
    ["empty", { messages: [] }],
    ["null body", null],
    ["invalid wallet", { messages: [{ role: "user", content: "balance" }], walletAddress: "0xno" }],
    ["not an array", { messages: "hello" }],
    ["unknown role", { messages: [{ role: "system", content: "hi" }] }],
    ["non-string content", { messages: [{ role: "user", content: 42 }] }],
    ["ends on assistant", { messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }] }],
    ["over the length cap", { messages: [{ role: "user", content: "x".repeat(2001) }] }],
  ];

  for (const [label, payload] of cases) {
    const response = await request.post("/api/chat", { data: payload });
    expect(response.status(), label).toBe(400);
  }

  const malformed = await request.post("/api/chat", {
    headers: { "Content-Type": "application/json" },
    data: "{not json",
  });
  expect(malformed.status()).toBe(400);
});
