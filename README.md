# Relay swap UDC to ETH

This project demonstrates how to call Pyth network Entropy contract using a SponsoredCall request
In order to do so, we will transfer USDC to the contract with the relayer using the `permit()`, swapping on-chain `USDC` for `ETH` using PancakeSwap router and finally calling `entropy.requestWithCallback{value: pythFee}`

1. Calling Permit and transfer
      ```
        token.permit(owner, address(this), fee, deadline, v, r, s);
        token.transferFrom(owner, address(this), fee);
      ```

2. Swapping the USDC for ETH with exact ETH amount

      ```
       router.swapTokensForExactETH(
            pythFee,
            fee,
            path,
            address(this),
            deadline
        );
      ```

3. Requesting Entropy Randomnumber

      ```
        address provider = entropy.getDefaultProvider();
        uint64 sequenceNumber = entropy.requestWithCallback{value: pythFee}(
            provider,
            randomNumber
        );
      ```


## Tests
We are forking arbitrum using [USDC](https://arbiscan.io/address/0xaf88d065e77c8cc2239327c5edb3a432268e5831), the [Pancake Router](0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb)

### Single call
In this [test](./test/CounterPermit.test.ts#L63) we are mocking the `sponsoredCall` calling `increment()` method and checking that the entropy contract balance should increase with the entropy fee

### Multiple call
In this [test](./test/CounterPermit.test.ts#L63) we are mocking the `sponsoredCall` calling the `multiCallIncrement()` sending two txs, and checking that the entropy contract balance should increase with  2 x entropy fee


## Quick Start
1. Install dependencies
   ```
   yarn install
   ```
2. Compile smart contracts
   ```
   yarn run hardhat compile
   ```
3. Run unit tests
   ```
   yarn run hardhat test
   ```
