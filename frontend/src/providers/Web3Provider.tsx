import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { InterwovenKitProvider, injectStyles } from "@initia/interwovenkit-react";
import { agentVaultChain } from "../lib/chains";
import type { ReactNode } from "react";

injectStyles();

const config = createConfig({
  chains: [agentVaultChain],
  transports: {
    [agentVaultChain.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <InterwovenKitProvider>
          {children}
        </InterwovenKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
