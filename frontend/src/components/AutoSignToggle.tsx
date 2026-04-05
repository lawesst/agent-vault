import { useAutoSign } from "../hooks/useAutoSign";

export function AutoSignToggle() {
  const { isEnabled, expiration, enable, disable, isEnabling, isDisabling } = useAutoSign();

  return (
    <div className="autosign-toggle">
      <div className="autosign-header">
        <h4>Agent Auto-Signing</h4>
        <span className={`status ${isEnabled ? "active" : "inactive"}`}>
          {isEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <p className="autosign-description">
        {isEnabled
          ? "Your agent can execute strategies without requiring wallet confirmation for each transaction."
          : "Enable auto-signing to let the agent execute strategies on your behalf. You can revoke at any time."}
      </p>

      {isEnabled && expiration && (
        <p className="autosign-expiry">
          Expires: {new Date(Number(expiration) * 1000).toLocaleString()}
        </p>
      )}

      <button
        className={`btn ${isEnabled ? "btn-danger" : "btn-primary"}`}
        onClick={() => (isEnabled ? disable() : enable())}
        disabled={isEnabling || isDisabling}
      >
        {isEnabling
          ? "Enabling..."
          : isDisabling
          ? "Disabling..."
          : isEnabled
          ? "Revoke Auto-Sign"
          : "Enable Auto-Sign"}
      </button>
    </div>
  );
}
