// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentRegistry
/// @notice Registry for AI agents offering DeFi strategies.
///         Tracks agent metadata, fee rates, and cumulative performance.
contract AgentRegistry {
    struct AgentInfo {
        address operator;
        string name;
        string strategyURI; // IPFS hash or URL describing the strategy
        uint256 feeRate; // Basis points (e.g., 1000 = 10% of profits)
        uint256 totalVaults;
        int256 totalPnL; // Cumulative P&L across all vaults (in wei)
        bool active;
        uint256 registeredAt;
    }

    mapping(address => AgentInfo) public agents;
    address[] public agentList;

    uint256 public registrationFee;
    address public feeRecipient;

    event AgentRegistered(address indexed operator, string name, uint256 feeRate);
    event AgentDeactivated(address indexed operator);
    event PerformanceUpdated(address indexed operator, int256 pnlDelta, int256 newTotalPnL);

    constructor(uint256 _registrationFee, address _feeRecipient) {
        registrationFee = _registrationFee;
        feeRecipient = _feeRecipient;
    }

    /// @notice Register as an agent. Pays registration fee.
    function registerAgent(string calldata _name, string calldata _strategyURI, uint256 _feeRate) external payable {
        require(!agents[msg.sender].active, "AgentRegistry: already registered");
        require(_feeRate <= 5000, "AgentRegistry: fee too high (max 50%)");
        require(msg.value >= registrationFee, "AgentRegistry: insufficient fee");

        agents[msg.sender] = AgentInfo({
            operator: msg.sender,
            name: _name,
            strategyURI: _strategyURI,
            feeRate: _feeRate,
            totalVaults: 0,
            totalPnL: 0,
            active: true,
            registeredAt: block.timestamp
        });

        agentList.push(msg.sender);

        if (registrationFee > 0) {
            (bool sent,) = feeRecipient.call{value: registrationFee}("");
            require(sent, "AgentRegistry: fee transfer failed");
        }

        // Refund excess
        if (msg.value > registrationFee) {
            (bool refunded,) = msg.sender.call{value: msg.value - registrationFee}("");
            require(refunded, "AgentRegistry: refund failed");
        }

        emit AgentRegistered(msg.sender, _name, _feeRate);
    }

    /// @notice Deactivate an agent (self-deactivation only)
    function deactivate() external {
        require(agents[msg.sender].active, "AgentRegistry: not active");
        agents[msg.sender].active = false;
        emit AgentDeactivated(msg.sender);
    }

    /// @notice Update agent performance. Called by VaultFactory on vault withdrawal.
    function updatePerformance(address _agent, int256 _pnlDelta) external {
        // In production, restrict to VaultFactory only. For hackathon, open.
        AgentInfo storage info = agents[_agent];
        require(info.active, "AgentRegistry: agent not active");
        info.totalPnL += _pnlDelta;
        emit PerformanceUpdated(_agent, _pnlDelta, info.totalPnL);
    }

    /// @notice Increment vault count for an agent. Called by VaultFactory.
    function incrementVaultCount(address _agent) external {
        agents[_agent].totalVaults += 1;
    }

    /// @notice Get agent info
    function getAgent(address _operator) external view returns (AgentInfo memory) {
        return agents[_operator];
    }

    /// @notice Check if an address is an active agent
    function isActiveAgent(address _operator) external view returns (bool) {
        return agents[_operator].active;
    }

    /// @notice Get total number of registered agents
    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    /// @notice List agents with pagination
    function listAgents(uint256 offset, uint256 limit) external view returns (AgentInfo[] memory) {
        uint256 total = agentList.length;
        if (offset >= total) return new AgentInfo[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        AgentInfo[] memory result = new AgentInfo[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = agents[agentList[offset + i]];
        }
        return result;
    }
}
