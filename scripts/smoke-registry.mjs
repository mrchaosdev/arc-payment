// Exercises a deployed InvoiceRegistry end to end against a live Arc network.
//
//   node scripts/smoke-registry.mjs --network testnet
//
// Reads the registry address from --registry or NEXT_PUBLIC_ARC_REGISTRY_MAINNET,
// .env.local. Spends about 0.02 USDC, paid from the deployer to itself, plus
// gas. Run it immediately after deployment; testnet is an optional rehearsal.
//
// The deployer plays issuer and payer at once. That is not a real invoice
// flow, but it covers every state transition without a second funded key,
// and the assertions below would fail the same way if the two were distinct.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createWalletClient,
  createPublicClient,
  defineChain,
  encodeAbiParameters,
  formatUnits,
  http,
  keccak256,
  parseSignature,
  parseUnits,
  toHex,
} from "viem";
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
  { type: "function", name: "nonces", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
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
const ordinaryId = (label) => toHex(
  BigInt(keccak256(toHex(label))) & ((1n << 255n) - 1n),
  { size: 32 },
);
const id = ordinaryId(`chaospay-smoke-${Date.now()}`);
const cancelId = ordinaryId(`chaospay-smoke-cancel-${Date.now()}`);
const requestKey = keccak256(toHex(`chaospay-smoke-direct-${Date.now()}`));
const memoHash = keccak256(toHex("INV-SMOKE-DIRECT"));

const directTypeHash = keccak256(
  toHex("ChaosPayDirectInvoiceV1(bytes32 requestKey,address issuer,address token,uint256 amount,bytes32 memoHash)"),
);
const directId = toHex(
  BigInt(
    keccak256(
      encodeAbiParameters(
        [
          { type: "bytes32" },
          { type: "bytes32" },
          { type: "address" },
          { type: "address" },
          { type: "uint256" },
          { type: "bytes32" },
        ],
        [directTypeHash, requestKey, account.address, arc_.usdc, half, memoHash],
      ),
    ),
  ) | (1n << 255n),
  { size: 32 },
);

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

console.log("\none-signature direct settlement");
// A zero allowance makes this path prove the permit was accepted: if the
// signature domain or fields drift, settleDirect's transferFrom must revert.
await send("clear allowance", { address: arc_.usdc, abi: erc20, functionName: "approve", args: [registry, 0n] });
const nonce = await publicClient.readContract({
  address: arc_.usdc,
  abi: erc20,
  functionName: "nonces",
  args: [account.address],
});
const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 30);
const signature = await account.signTypedData({
  domain: { name: "USDC", version: "2", chainId: arc_.chainId, verifyingContract: arc_.usdc },
  types: {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "Permit",
  message: { owner: account.address, spender: registry, value: half, nonce, deadline },
});
const { v, r, s } = parseSignature(signature);
await send("settleDirect + permit", {
  address: registry,
  abi,
  functionName: "settleDirect",
  args: [requestKey, account.address, arc_.usdc, half, memoHash, deadline, Number(v), r, s],
});
const direct = await read("getInvoice", [directId]);
assert(direct.status === 2, "direct invoice is recorded as Paid");
assert(direct.issuer.toLowerCase() === account.address.toLowerCase(), "direct invoice records the issuer");
assert(direct.amount === half && direct.paid === half, "direct invoice records the exact amount");
assert(
  (await publicClient.readContract({ address: arc_.usdc, abi: erc20, functionName: "nonces", args: [account.address] })) === nonce + 1n,
  "USDC consumed the EIP-2612 permit nonce",
);

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
