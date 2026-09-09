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
  await page.getByRole("button", { name: "Open the SealPay assistant" }).click();
  return page.getByRole("region", { name: "SealPay assistant" });
}

test("the launcher is the sphere, and a click on it reaches the button", async ({ page }) => {
  await page.goto("/pay");
  const launcher = page.getByRole("button", { name: "Open the SealPay assistant" });
  await expect(launcher).toBeVisible();
  // Space reserved is not the same as drawn.
  await expect(launcher.locator("canvas")).toBeVisible();

  // The sphere fills the button, so the click lands on its canvas. It only gets
  // through because the sphere is mounted non-interactive — with drag-to-spin on,
  // its own pointer handlers swallow this and the panel never opens.
  await launcher.click({ position: { x: 32, y: 32 } });
  await expect(page.getByRole("region", { name: "SealPay assistant" })).toBeVisible();
});

test("a suggestion streams an answer into the panel", async ({ page }) => {
  const answer = "Gas on Arc is paid in USDC, so there is no second token to buy first.";
  await stubAssistant(page, { body: answer });

  const panel = await openPanel(page);
  await expect(panel.getByText("It cannot see your wallet or your payments.")).toBeVisible();

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
  expect(second.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
  expect(second.messages[2].content).toBe("Follow up");
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
