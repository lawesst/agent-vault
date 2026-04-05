import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { useAccount } from "wagmi";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { Marketplace } from "./pages/Marketplace";
import { Dashboard } from "./pages/Dashboard";
import { AgentDetail } from "./pages/AgentDetail";

function Nav() {
  const { address } = useAccount();
  const { openConnect, openWallet } = useInterwovenKit();

  return (
    <nav className="nav">
      <div className="nav-brand">
        <h2>Agent Vault</h2>
        <span className="nav-tagline">AI-Powered DeFi on Initia</span>
      </div>
      <div className="nav-links">
        <NavLink to="/" end>Marketplace</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </div>
      <div className="nav-wallet">
        {address ? (
          <button className="btn btn-secondary" onClick={() => openWallet()}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => openConnect()}>
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <main className="main">
        <Routes>
          <Route path="/" element={<Marketplace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agent/:agentAddress" element={<AgentDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
