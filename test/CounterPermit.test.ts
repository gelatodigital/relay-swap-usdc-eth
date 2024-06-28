import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { PLAY_TOKEN, PLAY_SAFE } from "../src/constants";
import { SponsoredCallRequest } from "@gelatonetwork/relay-sdk";
import { sponsoredCallLocal } from "../src/__mock__/relay-sdk";
import { deployments, ethers } from "hardhat";
import { CounterPermit, ERC20Permit } from "../typechain";
import { signPermit } from "../src/signature";
import { expect } from "chai";
import { Contract } from "ethers";
import { CustomEthersSigner } from "@nomiclabs/hardhat-ethers/signers";

const getData = async (
  deployer: CustomEthersSigner,
  play: ERC20Permit,
  maxFee: number,
  counter: CounterPermit,
  chainId: number
) => {
  const deadline = Math.floor(Date.now() / 1000) + 60;

  const sig = await signPermit(
    deployer,
    play as unknown as Contract,
    BigInt(maxFee),
    counter.target as string,
    deadline,
    chainId
  );

  if (!sig) throw new Error("Invalid signature");

  let { v, r, s } = sig;

  let randomNumber = ethers.hexlify(ethers.randomBytes(32));

  let { data } = await counter.increment.populateTransaction(
    deployer.address,
    maxFee,
    randomNumber,
    deadline,
    v,
    r,
    s
  );

  return data;
};

describe("CounterPermit", () => {
  let counter: CounterPermit;

  before(async () => {
    await deployments.fixture();

    const { address: counterAddress } = await deployments.get("CounterPermit");

    counter = (await ethers.getContractAt(
      "CounterPermit",
      counterAddress
    )) as unknown as CounterPermit;
  });

  it("increment", async () => {
    const [deployer, user1] = await ethers.getSigners();
    const provider = await ethers.provider;
    const chainId = +(await provider.getNetwork()).chainId.toString();
    const maxFee = +ethers.parseEther("0.000000001").toString();
    const play = (await ethers.getContractAt(
      "ERC20Permit",
      PLAY_TOKEN
    )) as unknown as ERC20Permit;

    // transfer from safe to deployer
    await setBalance(PLAY_SAFE, ethers.parseEther("1"));

    const playSafe = await ethers.getImpersonatedSigner(PLAY_SAFE);

    await play.connect(playSafe).transfer(deployer.address, maxFee);
    await play.connect(playSafe).transfer(user1.address, maxFee);

    // sign permit signature

    let data = await getData(deployer, play, maxFee, counter, chainId);
    if (!data) throw new Error("Invalid transaction");

    const request: SponsoredCallRequest = {
      target: counter.target as string,
      data: data,
      chainId: (await provider.getNetwork()).chainId,
    };

    const counterBefore = await counter.counter(deployer.address);
    const entropyAddress = "0x7698E925FfC29655576D0b361D75Af579e20AdAc";
    const balanceBefore = await provider.getBalance(entropyAddress);

    const pythFee = await counter.getPythFee();

    await sponsoredCallLocal(request);
    const counterAfter = await counter.counter(deployer.address);

    const balanceAfter = await provider.getBalance(entropyAddress);

    expect(BigInt(counterAfter) - BigInt(counterBefore)).to.equal(1n);
    expect(BigInt(balanceAfter) - BigInt(pythFee)).to.equal(balanceBefore);
  });
  
  it("incrementBatchCall", async () => {
    const [deployer, user1] = await ethers.getSigners();
    const provider = await ethers.provider;
    const chainId = +(await provider.getNetwork()).chainId.toString();
    const maxFee = +ethers.parseEther("0.000000001").toString();
    const play = (await ethers.getContractAt(
      "ERC20Permit",
      PLAY_TOKEN
    )) as unknown as ERC20Permit;

    // transfer from safe to deployer
    await setBalance(PLAY_SAFE, ethers.parseEther("1"));

    const playSafe = await ethers.getImpersonatedSigner(PLAY_SAFE);

    await play.connect(playSafe).transfer(deployer.address, maxFee);
    await play.connect(playSafe).transfer(user1.address, maxFee);

    // sign permit signature

    let data1 = await getData(deployer, play, maxFee, counter, chainId);
    if (!data1) throw new Error("Invalid transaction");

    let data2 = await getData(user1, play, maxFee, counter, chainId);

    let { data } = await counter.multiCallIncrement.populateTransaction([
      data1,
      data2,
    ]);

    const request: SponsoredCallRequest = {
      target: counter.target as string,
      data: data,
      chainId: (await provider.getNetwork()).chainId,
    };

    const counterBefore = await counter.counter(deployer.address);
    const entropyAddress = "0x7698E925FfC29655576D0b361D75Af579e20AdAc";
    const balanceBefore = await provider.getBalance(entropyAddress);

    const pythFee = await counter.getPythFee();

    await sponsoredCallLocal(request);
    const counterAfter = await counter.counter(deployer.address);

    const balanceAfter = await provider.getBalance(entropyAddress);

    expect(BigInt(counterAfter) - BigInt(counterBefore)).to.equal(1n);
    expect(BigInt(balanceAfter) - BigInt(pythFee) - BigInt(pythFee)).to.equal(
      balanceBefore
    );
  });
});
