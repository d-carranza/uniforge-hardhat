// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "./../UniforgeDeployerV1.sol";
import "./../UniforgeCollection.sol";

error FailedWithdraw__DoesNotAcceptEther();

/**
 * @dev This contract does NOT accept Ether
 * 1 - Give this contract ownership of the target contract
 * 2 - Calling failedWithdraw() will cause withdraw() to fail
 */
contract FailedWithdraw {
    function failedDeployer(address _target) public {
        UniforgeDeployerV1 target = UniforgeDeployerV1(_target);
        target.withdraw();
    }

    function failedCollection(address _target) public {
        UniforgeCollection target = UniforgeCollection(_target);
        target.withdraw();
    }

    receive() external payable {
        revert FailedWithdraw__DoesNotAcceptEther();
    }
}
