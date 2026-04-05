import { defineChain } from "viem";

// Custom chain definition for our Initia EVM Minitia
// Update these values after running `weave init`
export const agentVaultChain = defineChain({
  id: Number(import.meta.env.VITE_CHAIN_ID || 1),
  name: "Agent Vault Minitia",
  nativeCurrency: {
    name: import.meta.env.VITE_NATIVE_SYMBOL || "INIT",
    symbol: import.meta.env.VITE_NATIVE_SYMBOL || "INIT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_JSON_RPC_URL || "http://localhost:8545"],
    },
  },
});
