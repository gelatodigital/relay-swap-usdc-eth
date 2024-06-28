import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { IERC20 } from "../../typechain";
import { ethers } from "hardhat";

import {
  CallWithSyncFeeRequest,
  CallWithSyncFeeERC2771Request,
  SponsoredCallRequest,
} from "@gelatonetwork/relay-sdk";

import {
  FEE_COLLECTOR,
  GELATO_RELAY,
  GELATO_RELAY_ERC2771,
} from "../constants";

/**
 * Emulates relay behaviour locally
 * https://github.com/gelatodigital/rel-example-unit-tests
 */
export const sponsoredCallLocal = async (
  request: SponsoredCallRequest,
  /* eslint-disable */
  sponsorApiKey?: string,
) => {
  const [deployer] = await ethers.getSigners();
  return deployer.sendTransaction({ to: request.target, data: request.data as string });
};

