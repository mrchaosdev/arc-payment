import type { Wallet } from "@rainbow-me/rainbowkit";
import { createPublicClient, http, numberToHex, SwitchChainError, type Address, type Hash, type Hex } from "viem";
import { arc, arcTestnet } from "viem/chains";
import { createConnector } from "wagmi";
import { ARC, ARC_RPC_URL } from "@/lib/arc";
import { clientKeyServes, passkeyUsername, shouldRetryUnsponsored } from "@/lib/passkey-policy";

/**
 * A passkey wallet: a Circle modular smart account owned by a WebAuthn
 * credential, so a payment is approved with the device's fingerprint or face
 * unlock instead of a browser extension. It stays non-custodial — the private
 * key never leaves the device's authenticator, and neither ChaosPay nor Circle
 * can sign for it.
 *
 * It plugs into wagmi as a connector, so `useAccount`, balances, history and
 * the receipt watchers see the smart account like any other wallet. Payments
 * go out as ERC-4337 user operations through Circle's bundler.
 */

const CLIENT_KEY = process.env.NEXT_PUBLIC_CLIENT_KEY?.trim() ?? "";
const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL?.trim() || "https://modular-sdk.circle.com/v1/rpc/w3s/buidl";

/** Offered only when a client key exists for this network. See `clientKeyServes`. */
export const PASSKEY_ENABLED = clientKeyServes(CLIENT_KEY, ARC.isTestnet);

export const PASSKEY_CONNECTOR_ID = "circlePasskey";

const chain = ARC.isTestnet ? arcTestnet : arc;
const CHAIN_PATH = ARC.isTestnet ? "arcTestnet" : "arc";

/**
 * Where the credential's public half is kept so a reload reconnects without a
 * prompt. It holds no secret: the id and public key of a passkey are what the
 * authenticator hands any site that asks, and signing still needs the device.
 */
const STORAGE_KEY = `chaospay-passkey-v1-${ARC.key}`;

type StoredCredential = { id: string; publicKey: Hex; rpId?: string };

export type PasskeyCall = { to: Address; data?: Hex; value?: bigint };

type Session = {
  address: Address;
  sendCalls(calls: readonly PasskeyCall[]): Promise<Hash>;
  signMessage(message: Hex): Promise<Hex>;
  signTypedData(typedData: unknown): Promise<Hex>;
};

let session: Session | null = null;

function readStored(): StoredCredential | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCredential;
    return parsed?.id && parsed?.publicKey ? parsed : null;
  } catch {
    return null;
  }
}

function store(credential: StoredCredential | null) {
  try {
    if (credential) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the session still works, it just will not survive a reload.
  }
}

/**
 * Opens the smart account for a credential: the stored one when reconnecting,
 * otherwise a passkey the user picks (login) or creates (register).
 *
 * The SDK is imported here rather than at the top so the wallet code is only
 * downloaded by someone who actually chooses the passkey wallet.
 */
async function openSession(mode: "login" | "register" | "restore"): Promise<Session> {
  const sdk = await import("@circle-fin/modular-wallets-core");
  const { createBundlerClient, toWebAuthnAccount } = await import("viem/account-abstraction");

  let credential = mode === "restore" ? readStored() : null;
  if (mode === "restore" && !credential) throw new Error("No saved passkey on this device.");
  if (!credential) {
    const created = await sdk.toWebAuthnCredential({
      transport: sdk.toPasskeyTransport(CLIENT_URL, CLIENT_KEY),
      mode: mode === "register" ? sdk.WebAuthnMode.Register : sdk.WebAuthnMode.Login,
      ...(mode === "register" ? { username: passkeyUsername() } : {}),
    });
    credential = { id: created.id, publicKey: created.publicKey, rpId: created.rpId };
    store(credential);
  }

  const transport = sdk.toModularTransport(`${CLIENT_URL}/${CHAIN_PATH}`, CLIENT_KEY);
  const client = createPublicClient({ chain, transport });
  const owner = toWebAuthnAccount({ credential: { id: credential.id, publicKey: credential.publicKey }, rpId: credential.rpId });
  const account = await sdk.toCircleSmartAccount({ client, owner });
  const bundler = createBundlerClient({ account, chain, client, transport });

  return {
    address: account.address,
    async sendCalls(calls) {
      const send = (paymaster: boolean) =>
        bundler.sendUserOperation({
          account,
          calls: calls.map(call => ({ to: call.to, data: call.data ?? "0x", value: call.value ?? BigInt(0) })),
          paymaster,
        });
      let userOperation: Hash;
      try {
        userOperation = await send(true);
      } catch (error) {
        if (!shouldRetryUnsponsored(error)) throw error;
        userOperation = await send(false);
      }
      // Arc finalizes in under a second, so waiting here keeps eth_sendTransaction
      // returning what every caller expects: the hash of a mined transaction.
      const { receipt } = await bundler.waitForUserOperationReceipt({ hash: userOperation });
      return receipt.transactionHash;
    },
    signMessage: message => account.signMessage({ message: { raw: message } }),
    signTypedData: typedData => account.signTypedData(typedData as Parameters<typeof account.signTypedData>[0]),
  };
}

function requireSession() {
  if (!session) throw new Error("The passkey wallet is not connected.");
  return session;
}

/**
 * Several calls as one user operation, approved with one passkey prompt and
 * applied atomically. Used where an EOA would need a permit signature plus a
 * transaction; a smart account approves and pays in the same operation.
 */
export function sendPasskeyCalls(calls: readonly PasskeyCall[]) {
  return requireSession().sendCalls(calls);
}

export function isPasskeyConnector(connector: { id: string } | undefined) {
  return Boolean(connector?.id.startsWith(PASSKEY_CONNECTOR_ID));
}

type RequestArguments = { method: string; params?: unknown };

/**
 * The EIP-1193 face wagmi talks to. Account and signing methods go to the
 * smart account; every read goes to the app's own Arc RPC.
 */
const reads = createPublicClient({ chain, transport: http(ARC_RPC_URL) });
const provider = {
  async request({ method, params }: RequestArguments): Promise<unknown> {
    const args = (params ?? []) as unknown[];
    switch (method) {
      case "eth_accounts":
      case "eth_requestAccounts":
        return session ? [session.address] : [];
      case "eth_chainId":
        return numberToHex(chain.id);
      case "eth_sendTransaction": {
        const [tx] = args as [{ to?: Address; data?: Hex; value?: Hex }];
        if (!tx?.to) throw new Error("The passkey wallet cannot deploy contracts.");
        return requireSession().sendCalls([{ to: tx.to, data: tx.data, value: tx.value ? BigInt(tx.value) : undefined }]);
      }
      case "personal_sign":
        return requireSession().signMessage(args[0] as Hex);
      case "eth_signTypedData_v4": {
        const data = args[1];
        return requireSession().signTypedData(typeof data === "string" ? JSON.parse(data) : data);
      }
      case "wallet_switchEthereumChain": {
        const [{ chainId }] = args as [{ chainId: Hex }];
        if (Number(chainId) !== chain.id) throw new SwitchChainError(new Error(`The passkey wallet lives on ${chain.name} only.`));
        return null;
      }
      default:
        return reads.request({ method, params } as Parameters<typeof reads.request>[0]);
    }
  },
  on() {},
  removeListener() {},
};

function passkeyConnector(mode: "login" | "register") {
  return createConnector<typeof provider>(config => ({
    id: mode === "register" ? `${PASSKEY_CONNECTOR_ID}-register` : PASSKEY_CONNECTOR_ID,
    name: mode === "register" ? "New passkey wallet" : "Passkey",
    type: PASSKEY_CONNECTOR_ID,
    async connect({ isReconnecting } = {}) {
      session = await openSession(isReconnecting ? "restore" : mode);
      return { accounts: [session.address], chainId: chain.id } as never;
    },
    async disconnect() {
      // Forget which passkey this browser used. The passkey itself stays on the
      // device, and signing in again with it opens the same smart account.
      session = null;
      store(null);
    },
    async getAccounts() {
      return session ? [session.address] : [];
    },
    async getChainId() {
      return chain.id;
    },
    async getProvider() {
      return provider;
    },
    async isAuthorized() {
      return typeof window !== "undefined" && readStored() !== null;
    },
    async switchChain({ chainId }) {
      if (chainId !== chain.id) throw new SwitchChainError(new Error(`The passkey wallet lives on ${chain.name} only.`));
      return chain;
    },
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {
      session = null;
      config.emitter.emit("disconnect");
    },
  }));
}

const PASSKEY_ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" fill="#111"/>' +
      '<circle cx="11" cy="11" r="4.5" fill="none" stroke="#f2f2f2" stroke-width="2"/>' +
      '<path d="M4 23c0-3.9 3.1-6.5 7-6.5 1.6 0 3 .4 4.2 1.2" fill="none" stroke="#f2f2f2" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="20" cy="17.5" r="2.6" fill="none" stroke="#ff6a1a" stroke-width="2"/>' +
      '<path d="M20 20.1V25m0-2h2" fill="none" stroke="#ff6a1a" stroke-width="2" stroke-linecap="round"/></svg>',
  );

function passkeyWallet(mode: "login" | "register"): Wallet {
  return {
    id: mode === "register" ? `${PASSKEY_CONNECTOR_ID}-register` : PASSKEY_CONNECTOR_ID,
    name: mode === "register" ? "New passkey wallet" : "Passkey",
    iconUrl: PASSKEY_ICON,
    iconBackground: "#111",
    installed: true,
    createConnector: walletDetails => createConnector(config => ({ ...passkeyConnector(mode)(config), ...walletDetails })),
  };
}

/** Sign in with a passkey this device already has for ChaosPay. */
export const passkeyLoginWallet = () => passkeyWallet("login");

/** Create a passkey, and with it a new smart account. */
export const passkeyRegisterWallet = () => passkeyWallet("register");
