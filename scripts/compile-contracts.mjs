// Compiles contracts/*.sol into contracts/out/<Name>.json (abi + bytecode).
//
// solc is pinned and run directly rather than through Foundry or Hardhat: the
// registry has no dependencies, no scripts of its own and one compilation
// target, so a toolchain would be the largest thing in the repo for no gain.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "contracts");
const out = join(src, "out");

const sources = Object.fromEntries(
  readdirSync(src)
    .filter((f) => f.endsWith(".sol"))
    .map((f) => [f, { content: readFileSync(join(src, f), "utf8") }]),
);

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    // Arc is EVM-equivalent, but the deployed opcode set is not something this
    // repo can verify from here. `paris` predates PUSH0, MCOPY and transient
    // storage, so the bytecode runs on any post-merge EVM including a
    // conservative one.
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
  },
};

const result = JSON.parse(solc.compile(JSON.stringify(input)));

const errors = (result.errors ?? []).filter((e) => e.severity === "error");
const warnings = (result.errors ?? []).filter((e) => e.severity !== "error");
for (const w of warnings) console.warn(w.formattedMessage);
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
for (const [file, contracts] of Object.entries(result.contracts)) {
  for (const [name, contract] of Object.entries(contracts)) {
    const artifact = {
      contractName: name,
      sourceName: `contracts/${basename(file)}`,
      compiler: { version: solc.version(), evmVersion: input.settings.evmVersion, optimizer: input.settings.optimizer },
      abi: contract.abi,
      bytecode: `0x${contract.evm.bytecode.object}`,
      deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
    };
    writeFileSync(join(out, `${name}.json`), `${JSON.stringify(artifact, null, 2)}\n`);
    const size = contract.evm.deployedBytecode.object.length / 2;
    console.log(`${name}: ${contract.abi.length} abi entries, ${size} bytes deployed`);
  }
}
