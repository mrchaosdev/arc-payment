import { test, expect } from "@playwright/test";

const recipient = "0x1111111111111111111111111111111111111111";
const receiver = "0x2222222222222222222222222222222222222222";

test("send and request drafts stay independent; request survives reload", async ({ page }) => {
  await page.goto("/pay");
  await page.getByRole("textbox", { name: "Recipient address", exact: true }).fill(recipient);
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("5");
  await page.getByRole("tab", { name: "Request payment" }).click();
  await expect(page.getByRole("textbox", { name: "Receive to", exact: true })).toHaveValue("");
  await page.getByRole("textbox", { name: "Receive to", exact: true }).fill(receiver);
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("2.000001");
  // Memo and reference are optional, so they now live behind a disclosure.
  await page.getByRole("button", { name: "Add details" }).click();
  await page.getByRole("textbox", { name: "Memo", exact: true }).fill("Coffee & design");
  await page.getByRole("button", { name: "Create payment link" }).click();
  const link = await page.getByRole("textbox", { name: "Payment link", exact: true }).inputValue();
  const url = new URL(link);
  expect(url.searchParams.get("to")).toBe(receiver);
  expect(url.searchParams.get("amount")).toBe("2.000001");
  await page.getByRole("tab", { name: "Send payment" }).click();
  await expect(page.getByRole("textbox", { name: "Recipient address", exact: true })).toHaveValue(recipient);
  await expect(page.getByRole("textbox", { name: "Amount", exact: true })).toHaveValue("5");
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "A payment for you." })).toBeVisible();
  // A shared link opens as a request to read. Nothing is editable until the payer
  // asks for it, so the recipient cannot be changed by accident on the way to pay.
  await expect(page.getByRole("textbox", { name: "Recipient address", exact: true })).toHaveCount(0);
  await expect(page.getByText(receiver, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Coffee & design", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByRole("textbox", { name: "Recipient address", exact: true })).toHaveValue(receiver);
  await expect(page.getByRole("textbox", { name: "Memo", exact: true })).toHaveValue("Coffee & design");
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await page.goto("/requests");
  await expect(page.getByRole("link", { name: "2.000001 USDC" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "2.000001 USDC" })).toBeVisible();
});

test("a saved request can be copied and shown as a code, not just opened", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/pay");
  await page.getByRole("tab", { name: "Request payment" }).click();
  await page.getByRole("textbox", { name: "Receive to", exact: true }).fill(receiver);
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("3");
  await page.getByRole("button", { name: "Create payment link" }).click();
  const link = await page.getByRole("textbox", { name: "Payment link", exact: true }).inputValue();

  await page.goto("/requests");
  const row = page.locator("li").filter({ hasText: "3 USDC" }).first();
  await row.getByRole("button", { name: "QR", exact: true }).click();
  await expect(row.getByRole("img", { name: "Payment link as a QR code" })).toBeVisible();
  await row.getByRole("button", { name: "Copy link" }).click();
  await expect(row.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
});

test("rejects imprecise request amount and supports keyboard tabs", async ({ page }) => {
  await page.goto("/pay");
  await page.getByRole("tab", { name: "Send payment" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Request payment" })).toBeFocused();
  await page.getByRole("textbox", { name: "Receive to", exact: true }).fill(recipient);
  await page.getByRole("textbox", { name: "Amount", exact: true }).fill("1.0000001");
  await page.getByRole("button", { name: "Create payment link" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "no more than 6 decimals" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Payment link", exact: true })).toHaveCount(0);
});

test("workspace layout, sidebar collapse, themes and narrow mobile", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Good things, in motion." })).toBeVisible();
  // Dark is the default theme, so assert the toggle flips whatever it starts on
  // rather than pinning one direction — that survives a change of default.
  const startedDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  await page.screenshot({ path: testInfo.outputPath(startedDark ? "dashboard-dark.png" : "dashboard-light.png"), fullPage: true });
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await page.getByRole("button", { name: "Toggle theme" }).click();
  if (startedDark) await expect(page.locator("html")).not.toHaveClass(/dark/);
  else await expect(page.locator("html")).toHaveClass(/dark/);
  await page.screenshot({ path: testInfo.outputPath(startedDark ? "dashboard-light.png" : "dashboard-dark.png"), fullPage: true });
  await page.goto("/pay");
  await page.screenshot({ path: testInfo.outputPath("payment-after-toggle.png"), fullPage: true });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole("navigation", { name: "Mobile workspace" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("payment-mobile.png"), fullPage: true });
  expect(errors).toEqual([]);
});
