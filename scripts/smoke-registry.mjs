// Exercises a deployed InvoiceRegistry end to end against a live Arc network.
//
//   node scripts/smoke-registry.mjs --network testnet
//
// Reads the registry address from --registry or NEXT_PUBLIC_ARC_REGISTRY_MAINNET,
// .env.local. Spends about 0.02 USDC, paid from the deployer to itself, plus
// gas. Run it on testnet before mainnet.
//
// The deployer plays issuer and payer at once. That is not a real invoice
// flow, but it covers every state transition without a second funded key,
// and the assertions below would fail the same way if the two were distinct.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, defineChain, keccak256, toHex, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arc, arcTestnet } from "viem/chains";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(join(root, ".env.local"));
} catch {}

const flag = process.argv.indexOf("--network");
const network = flag === -1 ? (process.env.NEXT_PUBLIC_ARC_NETWORK ?? "testnet") : process.argv[flag + 1];
if (network !== "mainnet" && network !== "testnet") throw new Error(`--network must be "mainnet" or "testnet".`);

process.env.NEXT_PUBLIC_ARC_NETWORK = network;
const { ARC_NETWORKS, resolveArcNetwork, ARC_USDC_DECIMALS } = await import("../src/lib/arc.ts");
const arc_ = resolveArcNetwork(ARC_NETWORKS[network]);

// Mainnet reads the address the app is built with; any other network has to
// be given one, because the app never carries a registry for it.
const registryFlag = process.argv.indexOf("--registry");
const registry = registryFlag === -1
  ? (network === "mainnet" ? process.env.NEXT_PUBLIC_ARC_REGISTRY_MAINNET : undefined)
  : process.argv[registryFlag + 1];
if (!registry)
  throw new Error(
    network === "mainnet"
      ? "NEXT_PUBLIC_ARC_REGISTRY_MAINNET is not set — deploy first, or pass --registry 0x…"
      : "Pass --registry 0x… : only mainnet keeps a registry address in the environment.",
  );
const key = process.env.DEPLOYER_PRIVATE_KEY;
if (!key) throw new Error("DEPLOYER_PRIVATE_KEY is not set.");

const abi = JSON.parse(readFileSync(join(root, "contracts/out/InvoiceRegistry.json"), "utf8")).abi;
const erc20 = [
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
];

// Arc's chain definition comes from viem rather than being rebuilt here. Its
// native currency is *called* USDC but carries eighteen decimals, while the
// ERC-20 USDC at 0x3600… has six; writing the chain out by hand is how that
// pair gets mixed up, and a gas estimate read at the wrong scale is off by a
// factor of a million. Only the RPC and the explorer are supplied, because
// viem ships neither for Arc.
const chain = defineChain({
  ...(network === "mainnet" ? arc : arcTestnet),
  rpcUrls: { default: { http: [arc_.rpcUrl] } },
  blockExplorers: { default: { name: "ArcScan", url: arc_.explorerUrl } },
});

const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const publicClient = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ account, chain, transport: http() });

const send = async (label, request) => {
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${label} reverted — ${arc_.explorerUrl}/tx/${hash}`);
  console.log(`  ok  ${label.padEnd(22)} ${arc_.explorerUrl}/tx/${hash}`);
  return receipt;
};

const assert = (condition, message) => {
  if (!condition) throw new Error(`assertion failed: ${message}`);
  console.log(`  ok  ${message}`);
};

const read = (functionName, args) => publicClient.readContract({ address: registry, abi, functionName, args });

const half = parseUnits("0.01", ARC_USDC_DECIMALS);
const total = half * 2n;
const id = keccak256(toHex(`chaospay-smoke-${Date.now()}`));
const cancelId = keccak256(toHex(`chaospay-smoke-cancel-${Date.now()}`));

console.log(`network   ${arc_.name} (chain ${arc_.chainId})`);
console.log(`registry  ${registry}`);
console.log(`account   ${account.address}`);
console.log(`balance   ${formatUnits(await publicClient.readContract({ address: arc_.usdc, abi: erc20, functionName: "balanceOf", args: [account.address] }), ARC_USDC_DECIMALS)} USDC\n`);

console.log("partial then full settlement");
await send("createInvoice", {
  address: registry, abi, functionName: "createInvoice",
  args: [id, account.address, arc_.usdc, total, 0n, keccak256(toHex("INV-SMOKE-001"))],
});
assert((await read("getInvoice", [id])).status === 1, "invoice opens as Open");
assert((await read("outstanding", [id])) === total, "outstanding equals the full amount");

await send("approve", { address: arc_.usdc, abi: erc20, functionName: "approve", args: [registry, total] });
await send("pay (half)", { address: registry, abi, functionName: "pay", args: [id, half] });
assert((await read("getInvoice", [id])).status === 1, "invoice stays Open after a partial payment");
assert((await read("outstanding", [id])) === half, "outstanding drops by the amount paid");

await send("pay (remainder)", { address: registry, abi, functionName: "pay", args: [id, half] });
const settled = await read("getInvoice", [id]);
assert(settled.status === 2, "invoice flips to Paid once covered");
assert(settled.paid === total, "paid total is recorded");
assert((await read("outstanding", [id])) === 0n, "nothing is outstanding");

console.log("\ncancellation");
await send("createInvoice", {
  address: registry, abi, functionName: "createInvoice",
  args: [cancelId, account.address, arc_.usdc, total, 0n, "0x" + "0".repeat(64)],
});
await send("cancel", { address: registry, abi, functionName: "cancel", args: [cancelId] });
assert((await read("getInvoice", [cancelId])).status === 3, "cancelled invoice reads as Cancelled");

console.log("\nrejections");
for (const [label, call] of [
  ["paying a cancelled invoice", { functionName: "pay", args: [cancelId, half] }],
  ["paying an unknown invoice", { functionName: "pay", args: [keccak256(toHex("nope")), half] }],
  ["reusing an invoice id", { functionName: "createInvoice", args: [id, account.address, arc_.usdc, total, 0n, "0x" + "0".repeat(64)] }],
  ["cancelling a settled invoice", { functionName: "cancel", args: [id] }],
]) {
  let reverted = false;
  try {
    await publicClient.simulateContract({ address: registry, abi, account, ...call });
  } catch {
    reverted = true;
  }
  assert(reverted, `${label} reverts`);
}

console.log(`\nregistry ${arc_.explorerUrl}/address/${registry}`);
console.log("smoke test passed");
