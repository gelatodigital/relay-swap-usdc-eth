// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {
    IEntropyConsumer
} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {IEntropy} from "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import {
    ERC20Permit
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

import {IRouter} from "./interfaces/IRouter.sol";
import "hardhat/console.sol";

contract CounterPermit {
    mapping(address => uint256) public counter;
    IRouter public router;
    ERC20Permit public token;
    IEntropy entropy = IEntropy(0x7698E925FfC29655576D0b361D75Af579e20AdAc);
    event IncrementCounter(uint256 newCounterValue, address msgSender);

    constructor(IRouter _router, ERC20Permit _token) {
        router = _router;
        token = _token;
    }

    function multiCallIncrement(
        bytes[] calldata data
    ) external returns (bytes[] memory) {
        bytes[] memory results = new bytes[](data.length);
        for (uint i; i < data.length; i++) {
            (bool success, bytes memory result) = address(this).call(data[i]);
            require(success, "call failed");
            results[i] = result;
        }
        return results;
    }

    function increment(
        address owner,
        uint256 fee,
        bytes32 randomNumber,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        token.permit(owner, address(this), fee, deadline, v, r, s);
        token.transferFrom(owner, address(this), fee);
        _swapAndCallEntropy(fee, deadline, randomNumber);
        counter[owner]++;
        emit IncrementCounter(counter[owner], owner);
    }

    function _swapAndCallEntropy(
        uint256 fee,
        uint256 deadline,
        bytes32 randomNumber
    ) internal {
        address WETH = router.WETH();

        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = WETH;

        token.approve(address(router), fee);

        uint pythFee = getPythFee();

        router.swapTokensForExactETH(
            pythFee,
            fee,
            path,
            address(this),
            deadline
        );

        address provider = entropy.getDefaultProvider();
        uint64 sequenceNumber = entropy.requestWithCallback{value: pythFee}(
            provider,
            randomNumber
        );
    }

    function getPythFee() public view returns (uint256) {
        address provider = entropy.getDefaultProvider();
        return entropy.getFee(provider);
    }

    receive() external payable {}
}
