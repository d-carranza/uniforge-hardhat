import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { developmentChains } from "../../helper-hardhat-config"
import { UniforgeDeployerV1, UniforgeCollection } from "../../typechain-types"
import { network, deployments, ethers } from "hardhat"
import { Address } from "hardhat-deploy/types"
import { expect } from "chai"
import { BigNumber } from "ethers"
import fs from "fs"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Uniforge", function () {
          // Global variables
          let accounts: SignerWithAddress[]
          let deployer: SignerWithAddress
          let client: SignerWithAddress
          let user: SignerWithAddress
          let uniforgeDeployerV1: UniforgeDeployerV1
          const UniforgeCollectionAbi =
              require("../../artifacts/contracts/UniforgeCollection.sol/UniforgeCollection.json").abi
          let args: [Address, string, string, string, BigNumber, number, number, number]
          let deployFee: BigNumber

          // Get ABI from UniforgeCollection

          beforeEach(async () => {
              // Asign signers
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              client = accounts[1]
              user = accounts[2]
              // Deploy UniforgeDeployerV1
              await deployments.fixture(["deployer"])
              uniforgeDeployerV1 = await ethers.getContract("UniforgeDeployerV1", deployer.address)
              deployFee = ethers.utils.parseEther("0.1")
              await uniforgeDeployerV1.setDeployFee(deployFee)
          })
          describe("staging test", () => {
              it("client creates and owns a collection, user mints and owns NFTs, client and deployer withdraw successfully", async () => {
                  // Connect contract with the client
                  const clientConnectedToDeployer = uniforgeDeployerV1.connect(client)

                  // Create a new collection and get it's address
                  const mintFee = ethers.utils.parseEther("0.01")
                  args = [
                      client.address,
                      "Dappenics",
                      "DAPE",
                      "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/",
                      mintFee,
                      10,
                      2,
                      1678060760,
                  ]
                  const response = await clientConnectedToDeployer.deployUniforgeCollection(
                      ...args,
                      {
                          value: deployFee,
                      }
                  )
                  const receipt = await response.wait(1)
                  const newUniforgeCollectionAddress = receipt.events![2].args![0]

                  // Connect with the new deployed contract
                  const uniforgeCollection = new ethers.Contract(
                      newUniforgeCollectionAddress,
                      UniforgeCollectionAbi,
                      client
                  )

                  /*OWNERSHIP CHECK*/

                  // __Expects client be the owner of UniforgeCollection
                  expect(await uniforgeCollection.owner()).to.equal(client.address)

                  // Connect with user
                  const userConnectedToCollection = uniforgeCollection.connect(user)
                  // user mints a NFT paying the fee
                  const userMintAmount = 2
                  await userConnectedToCollection.mintNft(userMintAmount, { value: mintFee.mul(2) })

                  // Expects user to be the owner of NFT tokenID(1)
                  expect(await uniforgeCollection.ownerOf(0)).to.equal(user.address)
                  expect(await uniforgeCollection.ownerOf(1)).to.equal(user.address)

                  const clientConnectedToCollection = uniforgeCollection.connect(client)

                  /*WITHDRAWS BALANCE CHECK*/

                  // Initial balance
                  const deployerInitialBalance = await deployer.getBalance()
                  const clientInitialBalance = await client.getBalance()

                  // Deployer withdraws the UniforgeDeployer contract
                  const deployerWithdrawResponse: any = await uniforgeDeployerV1.withdraw()
                  const deployerWithdrawReceipt = await deployerWithdrawResponse.wait(1)
                  const deployerGasUsed = deployerWithdrawReceipt.gasUsed.mul(
                      deployerWithdrawResponse.gasPrice
                  )

                  // Client withdraws the UniforgeCollection contract
                  const clientWithdrawResponse: any = await clientConnectedToCollection.withdraw()
                  const clientWithdrawReceipt = await clientWithdrawResponse.wait(1)
                  const clientGasUsed = clientWithdrawReceipt.gasUsed.mul(
                      clientWithdrawResponse.gasPrice
                  )

                  // Final balance
                  const deployerFinalBalance = await deployer.getBalance()
                  const clientFinalBalance = await client.getBalance()

                  // Expected balances (Initial + Fee - Gas) == Final
                  const deployerExpectedBalance = deployerInitialBalance.add(
                      deployFee.sub(deployerGasUsed)
                  )
                  const clientExpectedBalance = clientInitialBalance.add(
                      mintFee.mul(userMintAmount).sub(clientGasUsed)
                  )

                  // Expect balances to match the final state
                  expect(deployerExpectedBalance).to.equal(deployerFinalBalance)
                  expect(clientExpectedBalance).to.equal(clientFinalBalance)
              })
          })
      })
