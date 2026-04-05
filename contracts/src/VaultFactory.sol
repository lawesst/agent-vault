// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentVault} from "./AgentVault.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title VaultFactory
/// @notice Creates AgentVault instances for users. Each vault is a fresh contract
///         linking one user to one agent with defined permissions.
contract VaultFactory {
    AgentRegistry public registry;

    uint256 public platformFeeRate; // Basis points (e.g., 500 = 5%)
    address public platformFeeRecipient;

    // User => list of vault addresses
    mapping(address => address[]) public userVaults;
    // Agent => list of vault addresses
    mapping(address => address[]) public agentVaults;
    // All vaults
    address[] public allVaults;

    event VaultCreated(
        address indexed vault,
        address indexed user,
        address indexed agent,
        address[] allowedTargets
    );

    constructor(address _registry, uint256 _platformFeeRate, address _platformFeeRecipient) {
        registry = AgentRegistry(_registry);
        platformFeeRate = _platformFeeRate;
        platformFeeRecipient = _platformFeeRecipient;
    }

    /// @notice Create a new vault for a user-agent pair
    /// @param _agent The agent operator address
    /// @param _allowedTargets Contracts the agent is allowed to interact with
    function createVault(address _agent, address[] calldata _allowedTargets) external returns (address) {
        require(registry.isActiveAgent(_agent), "VaultFactory: agent not active");

        AgentRegistry.AgentInfo memory agentInfo = registry.getAgent(_agent);

        // Deploy a new AgentVault
        AgentVault vault = new AgentVault();
        vault.initialize(
            msg.sender,
            _agent,
            agentInfo.feeRate,
            platformFeeRate,
            platformFeeRecipient,
            _allowedTargets
        );

        address vaultAddr = address(vault);
        userVaults[msg.sender].push(vaultAddr);
        agentVaults[_agent].push(vaultAddr);
        allVaults.push(vaultAddr);

        registry.incrementVaultCount(_agent);

        emit VaultCreated(vaultAddr, msg.sender, _agent, _allowedTargets);

        return vaultAddr;
    }

    /// @notice Get all vaults for a user
    function getUserVaults(address _user) external view returns (address[] memory) {
        return userVaults[_user];
    }

    /// @notice Get all vaults managed by an agent
    function getAgentVaults(address _agent) external view returns (address[] memory) {
        return agentVaults[_agent];
    }

    /// @notice Get total number of vaults created
    function getVaultCount() external view returns (uint256) {
        return allVaults.length;
    }

    /// @notice Get vault address by index
    function getVaultAt(uint256 index) external view returns (address) {
        return allVaults[index];
    }
}
