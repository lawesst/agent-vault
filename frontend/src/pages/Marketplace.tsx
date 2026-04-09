import { useNavigate } from "react-router-dom";
import { useAgentList, useAgentCount } from "../hooks/useAgentRegistry";
import { useVaultCount } from "../hooks/useVaultFactory";
import { AgentCard } from "../components/AgentCard";
import type { AgentInfo } from "../hooks/useAgentRegistry";

export function Marketplace() {
  const navigate = useNavigate();
  const {
    data: agentCount,
    error: agentCountError,
    isLoading: isCountLoading,
    refetch: refetchCount,
  } = useAgentCount();
  const count = agentCount ? Number(agentCount) : 0;
  // Only request the agents that actually exist, capped at 50.
  const {
    data: agents,
    error: agentListError,
    isLoading: isListLoading,
    refetch: refetchList,
  } = useAgentList(0, Math.min(count || 50, 50));
  const { data: vaultCount, error: vaultCountError } = useVaultCount();

  const rpcError = agentCountError || agentListError || vaultCountError;
  const isRpcUnreachable = Boolean(rpcError);
  const isLoading = isCountLoading || isListLoading;

  const handleRetry = () => {
    refetchCount();
    refetchList();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Agent Marketplace</h1>
        <p>Browse AI agents offering DeFi strategies. Deposit funds and let agents work for you.</p>
      </div>

      <div className="stats-bar">
        <div className="stat-box">
          <span className="stat-box-value">{agentCount?.toString() ?? "—"}</span>
          <span className="stat-box-label">Active Agents</span>
        </div>
        <div className="stat-box">
          <span className="stat-box-value">{vaultCount?.toString() ?? "—"}</span>
          <span className="stat-box-label">Total Vaults</span>
        </div>
      </div>

      {isRpcUnreachable ? (
        <div className="empty-state error-state" role="alert">
          <h3>Can't reach the network</h3>
          <p>
            The Agent Vault Minitia RPC at{" "}
            <code>{import.meta.env.VITE_JSON_RPC_URL ?? "http://localhost:8545"}</code> isn't
            responding. This usually means the local chain isn't running.
          </p>
          <p className="error-hint">
            Start it with <code>minitiad start</code>, then retry.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="agent-grid">
          {Array.from({ length: Math.max(count, 3) }).map((_, i) => (
            <div key={i} className="agent-card skeleton-card" aria-hidden="true">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
            </div>
          ))}
        </div>
      ) : !agents || (agents as AgentInfo[]).length === 0 ? (
        <div className="empty-state">
          <p>No agents registered yet. Be the first to register!</p>
        </div>
      ) : (
        <div className="agent-grid">
          {(agents as AgentInfo[]).map((agent) => (
            <AgentCard
              key={agent.operator}
              agent={agent}
              onClick={() => navigate(`/agent/${agent.operator}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
