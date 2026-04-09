import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { InterwovenKitProvider, injectStyles } from "@initia/interwovenkit-react";
// InterwovenKit renders its bridge/auto-sign/wallet modals inside a shadow DOM
// and ships the CSS as a raw string. We have to push that string into the
// shadow root via `injectStyles` — a plain CSS import would not work because
// the selectors use `:host([data-theme])`.
import interwovenKitStyles from "@initia/interwovenkit-react/styles.js";
import { agentVaultChain } from "../lib/chains";
import type { ReactNode } from "react";

const config = createConfig({
  chains: [agentVaultChain],
  transports: {
    [agentVaultChain.id]: http(),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep contract reads fresh for 30s and cached for 5min so navigating
      // between pages doesn't trigger a fresh RPC round-trip every time.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

export function Web3Provider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Inject InterwovenKit's bundled styles into the shadow DOM so the
    // bridge / auto-sign / wallet modals render with their default styling.
    injectStyles(interwovenKitStyles);
  }, []);

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
