import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useAgent } from "../hooks/useAgentRegistry";
import { useCreateVault } from "../hooks/useVaultFactory";
import { CONTRACTS } from "../lib/contracts";
import { formatEther } from "viem";

export function AgentDetail() {
  const { agentAddress } = useParams<{ agentAddress: string }>();
  const navigate = useNavigate();
  const { address } = useAccount();
  const { openConnect } = useInterwovenKit();
  const { data: agent, isLoading } = useAgent(agentAddress as `0x${string}`);
  const { createVault, isPending, isConfirming, isSuccess, error } = useCreateVault();

  if (isLoading) return <div className="page"><div className="loading-state">Loading agent...</div></div>;
  if (!agent) return <div className="page"><div className="empty-state">Agent not found</div></div>;

  const typedAgent = agent as {
    operator: `0x${string}`;
    name: string;
    strategyURI: string;
    feeRate: bigint;
    totalVaults: bigint;
    totalPnL: bigint;
    active: boolean;
    registeredAt: bigint;
  };

  const feePercent = Number(typedAgent.feeRate) / 100;
  const pnl = Number(formatEther(typedAgent.totalPnL));

  const handleCreateVault = () => {
    if (!address) {
      openConnect();
      return;
    }
    // Allow agent to interact with both mock lending pools
    const allowedTargets: `0x${string}`[] = [CONTRACTS.MOCK_POOL_A, CONTRACTS.MOCK_POOL_B];
    createVault(agentAddress as `0x${string}`, allowedTargets);
  };

  if (isSuccess) {
    return (
      <div className="page">
        <div className="success-state">
          <h2>Vault Created!</h2>
          <p>Your vault has been created. Go to your dashboard to deposit funds and enable auto-signing.</p>
          <button className="btn btn-primary" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="btn-link" onClick={() => navigate("/")}>
        &larr; Back to Marketplace
      </button>

      <div className="agent-detail">
        <div className="agent-detail-header">
          <h1>{typedAgent.name}</h1>
          <span className={`status ${typedAgent.active ? "active" : "inactive"}`}>
            {typedAgent.active ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="agent-detail-info">
          <div className="info-row">
            <span className="info-label">Operator</span>
            <span className="info-value">{typedAgent.operator}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Agent Fee</span>
            <span className="info-value">{feePercent}% of profits</span>
          </div>
          <div className="info-row">
            <span className="info-label">Platform Fee</span>
            <span className="info-value">5% of profits</span>
          </div>
          <div className="info-row">
            <span className="info-label">Active Vaults</span>
            <span className="info-value">{typedAgent.totalVaults.toString()}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total P&L</span>
            <span className={`info-value ${pnl >= 0 ? "positive" : "negative"}`}>
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(4)} INIT
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Strategy</span>
            <span className="info-value">{typedAgent.strategyURI || "Yield Rebalancer"}</span>
          </div>
        </div>

        <div className="strategy-description">
          <h3>How It Works</h3>
          <ol>
            <li>Create a vault and deposit funds</li>
            <li>Enable auto-signing on your dashboard</li>
            <li>The AI agent monitors lending pool rates across our Minitia</li>
            <li>When a better rate is found, the agent automatically rebalances your funds</li>
            <li>Withdraw anytime — fees are only charged on profits</li>
          </ol>
        </div>

        {error && <p className="error">{error.message}</p>}

        <button
          className="btn btn-primary btn-large"
          onClick={handleCreateVault}
          disabled={isPending || isConfirming || !typedAgent.active}
        >
          {!address
            ? "Connect Wallet to Start"
            : isPending
            ? "Confirming..."
            : isConfirming
            ? "Creating Vault..."
            : "Create Vault with This Agent"}
        </button>
      </div>
    </div>
  );
}
