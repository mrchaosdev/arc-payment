// Deploys InvoiceRegistry and prints the address to put in .env.local.
//
//   node scripts/deploy-registry.mjs --network testnet
//   node scripts/deploy-registry.mjs --network mainnet
//
// Needs DEPLOYER_PRIVATE_KEY in .env.local (gitignored) and USDC on Arc in
// that account — Arc charges gas in USDC, so an empty account cannot deploy.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http, defineChain, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arc, arcTestnet } from "viem/chains";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(join(root, ".env.local"));
} catch {
  // Absent .env.local is fine as long as the variables are already exported.
}

const flag = process.argv.indexOf("--network");
const network = flag === -1 ? (process.env.NEXT_PUBLIC_ARC_NETWORK ?? "testnet") : process.argv[flag + 1];
if (network !== "mainnet" && network !== "testnet") {
  throw new Error(`--network must be "mainnet" or "testnet", got "${network}".`);
}

process.env.NEXT_PUBLIC_ARC_NETWORK = network;
const { ARC_NETWORKS, resolveArcNetwork } = await import("../src/lib/arc.ts");
const arc_ = resolveArcNetwork(ARC_NETWORKS[network]);

const key = process.env.DEPLOYER_PRIVATE_KEY;
if (!key) throw new Error("DEPLOYER_PRIVATE_KEY is not set. Put it in .env.local — the file is gitignored.");

const artifact = JSON.parse(readFileSync(join(root, "contracts/out/InvoiceRegistry.json"), "utf8"));

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
const GAS_DECIMALS = chain.nativeCurrency.decimals;

const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const publicClient = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ account, chain, transport: http() });

const balance = await publicClient.getBalance({ address: account.address });
console.log(`network   ${arc_.name} (chain ${arc_.chainId})`);
console.log(`deployer  ${account.address}`);
console.log(`gas funds ${formatUnits(balance, GAS_DECIMALS)} USDC`);
if (balance === 0n) throw new Error("Deployer holds no USDC for gas on this network.");

const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [] });
console.log(`\ntx        ${hash}`);
console.log(`          ${arc_.explorerUrl}/tx/${hash}`);

const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success" || !receipt.contractAddress) {
  throw new Error(`Deployment reverted (status ${receipt.status}).`);
}

console.log(`\nInvoiceRegistry deployed`);
console.log(`address   ${receipt.contractAddress}`);
console.log(`block     ${receipt.blockNumber}`);
console.log(`gas used  ${receipt.gasUsed} (${formatUnits(receipt.gasUsed * receipt.effectiveGasPrice, GAS_DECIMALS)} USDC)`);
console.log(`          ${arc_.explorerUrl}/address/${receipt.contractAddress}`);
if (network === "mainnet") {
  console.log(`
Add to .env.local, and to the Vercel build environment:
NEXT_PUBLIC_ARC_REGISTRY_MAINNET=${receipt.contractAddress}`);
} else {
  // The app reads a registry on mainnet only, so a testnet deployment is
  // something to exercise from the scripts and then forget.
  console.log(`
The app reads a registry on mainnet only, so there is nothing to configure.
To exercise this one:
  npm run contracts:smoke -- --network testnet --registry ${receipt.contractAddress}`);
}
