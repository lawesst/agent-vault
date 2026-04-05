import { useNavigate } from "react-router-dom";
import { useAgentList, useAgentCount } from "../hooks/useAgentRegistry";
import { useVaultCount } from "../hooks/useVaultFactory";
import { AgentCard } from "../components/AgentCard";
import type { AgentInfo } from "../hooks/useAgentRegistry";

export function Marketplace() {
  const navigate = useNavigate();
  const { data: agentCount } = useAgentCount();
  const { data: agents, isLoading } = useAgentList(0, 50);
  const { data: vaultCount } = useVaultCount();

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

      {isLoading ? (
        <div className="loading-state">Loading agents...</div>
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
