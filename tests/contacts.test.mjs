import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.startsWith(new URL("../src/", import.meta.url).href))
    return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { validateContact } = await import("../src/lib/contacts.ts");
const address = "0x1111111111111111111111111111111111111111";

test("contact names and addresses are trimmed and invalid recipients rejected", () => {
  assert.deepEqual(validateContact("  Linh  ", ` ${address} `, []), { name: "Linh", address });
  for (const value of ["0x", "0x" + "0".repeat(40), address + "ff"]) assert.throws(() => validateContact("Linh", value, []));
  for (const name of [" ", "a".repeat(49)]) assert.throws(() => validateContact(name, address, []));
});

test("contacts reject duplicate recipients while allowing edits to the same contact", () => {
  const contacts = [{ id: "one", name: "Linh", address }];
  assert.throws(() => validateContact("Duplicate", address, contacts), /already/);
  assert.equal(validateContact("New name", address, contacts, "one").name, "New name");
  assert.throws(() => validateContact("New contact", address, Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: "Other", address: "0x2222222222222222222222222222222222222222" }))), /100/);
});
