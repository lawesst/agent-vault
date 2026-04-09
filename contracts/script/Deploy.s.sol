// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {VaultFactory} from "../src/VaultFactory.sol";
import {MockLendingPool} from "../src/MockLendingPool.sol";

/// @title Deploy
/// @notice Deploys the full Agent Vault stack in a deterministic order so the
///         resulting addresses are reproducible across local runs.
///
/// Usage:
///   forge script script/Deploy.s.sol:Deploy \
///       --rpc-url http://localhost:8545 \
///       --private-key $DEPLOYER_KEY \
///       --broadcast -vvv
///
/// Defaults (override with env vars):
///   REGISTRATION_FEE    0       (in wei; free registration for the hackathon demo)
///   PLATFORM_FEE_BPS    500     (5% of profits go to the platform)
///   POOL_A_NAME         "Stable Yield Pool"
///   POOL_A_RATE_BPS     500     (5% APY)
///   POOL_B_NAME         "High Yield Pool"
///   POOL_B_RATE_BPS     800     (8% APY)
///
/// The fee recipient and platform fee recipient both default to the deployer.
///
/// IMPORTANT: to reproduce the existing addresses hard-coded in the .env files
/// (e.g. 0x5FbDB2315678afecb367f032d93F642f64180aa3 for AgentRegistry), run
/// this script as the *first* four transactions of the deployer account on
/// a fresh chain. The addresses are a pure function of (deployer, nonce), so
/// nonces 0..3 on account 0xf39F... produce the canonical Anvil addresses.
contract Deploy is Script {
    function run()
        external
        returns (
            AgentRegistry registry,
            VaultFactory factory,
            MockLendingPool poolA,
            MockLendingPool poolB
        )
    {
        uint256 registrationFee = _envUintOr("REGISTRATION_FEE", 0);
        uint256 platformFeeBps = _envUintOr("PLATFORM_FEE_BPS", 500);
        string memory poolAName = _envStringOr("POOL_A_NAME", "Stable Yield Pool");
        uint256 poolARate = _envUintOr("POOL_A_RATE_BPS", 500);
        string memory poolBName = _envStringOr("POOL_B_NAME", "High Yield Pool");
        uint256 poolBRate = _envUintOr("POOL_B_RATE_BPS", 800);

        vm.startBroadcast();
        address deployer = msg.sender;

        // Order matters: these four transactions must be the deployer's first
        // four in a fresh chain to reproduce the hard-coded .env addresses.
        registry = new AgentRegistry(registrationFee, deployer);
        factory = new VaultFactory(address(registry), platformFeeBps, deployer);
        poolA = new MockLendingPool(poolAName, poolARate);
        poolB = new MockLendingPool(poolBName, poolBRate);

        vm.stopBroadcast();

        console2.log("==========================================");
        console2.log("  Agent Vault deployment complete");
        console2.log("==========================================");
        console2.log("Deployer:              ", deployer);
        console2.log("AgentRegistry:         ", address(registry));
        console2.log("VaultFactory:          ", address(factory));
        console2.log("MockLendingPool (A):   ", address(poolA));
        console2.log("MockLendingPool (B):   ", address(poolB));
        console2.log("");
        console2.log("Copy these into:");
        console2.log("  frontend/.env       (VITE_AGENT_REGISTRY_ADDRESS, etc.)");
        console2.log("  agent-service/.env  (AGENT_REGISTRY_ADDRESS, etc.)");
    }

    function _envUintOr(string memory key, uint256 fallbackValue) internal view returns (uint256) {
        try vm.envUint(key) returns (uint256 v) {
            return v;
        } catch {
            return fallbackValue;
        }
    }

    function _envStringOr(string memory key, string memory fallbackValue) internal view returns (string memory) {
        try vm.envString(key) returns (string memory v) {
            return v;
        } catch {
            return fallbackValue;
        }
    }
}
