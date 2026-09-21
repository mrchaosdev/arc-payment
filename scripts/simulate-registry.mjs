// Runs settleDirect with a real Arc USDC permit inside eth_call. State override
// installs the compiled registry bytecode and funds a fresh throwaway payer for
// the duration of that one call, so this proves the happy path without a deploy
// or a private key supplied by the user.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  defineChain,
  encodeFunctionData,
  http,
  keccak256,
  parseSignature,
  parseUnits,
  toHex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { arc } from "viem/chains";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const artifact = JSON.parse(readFileSync(join(root, "contracts/out/InvoiceRegistry.json"), "utf8"));
const rpcUrl = "https://rpc.blockdaemon.mainnet.arc.io";
const chain = defineChain({
  ...arc,
  rpcUrls: { default: { http: [rpcUrl] } },
});
const client = createPublicClient({ chain, transport: http() });
const payer = privateKeyToAccount(generatePrivateKey());
const registry = privateKeyToAccount(generatePrivateKey()).address;
const issuer = privateKeyToAccount(generatePrivateKey()).address;
const usdc = "0x3600000000000000000000000000000000000000";
const amount = parseUnits("0.01", 6);
const requestKey = keccak256(toHex("chaospay-state-override-happy-path"));
const memoHash = keccak256(toHex("INV-STATE-OVERRIDE"));
const deadline = BigInt(Math.floor(Date.now() / 1_000) + 30 * 60);
const permitAbi = [{
  type: "function",
  name: "nonces",
  stateMutability: "view",
  inputs: [{ name: "owner", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
}];
const nonce = await client.readContract({ address: usdc, abi: permitAbi, functionName: "nonces", args: [payer.address] });
const signature = await payer.signTypedData({
  domain: { name: "USDC", version: "2", chainId: arc.id, verifyingContract: usdc },
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
  message: { owner: payer.address, spender: registry, value: amount, nonce, deadline },
});
const { v, r, s } = parseSignature(signature);
const data = encodeFunctionData({
  abi: artifact.abi,
  functionName: "settleDirect",
  args: [requestKey, issuer, usdc, amount, memoHash, deadline, Number(v), r, s],
});

await client.call({
  account: payer.address,
  to: registry,
  data,
  stateOverride: [
    { address: payer.address, balance: parseUnits("1", 18) },
    { address: registry, code: artifact.deployedBytecode },
  ],
});

console.log("ok  settleDirect accepted a real EIP-2612 permit and transferred Arc USDC");
console.log("ok  state override discarded all balances and contract state; no funds were spent");
