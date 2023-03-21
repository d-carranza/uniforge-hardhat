import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { developmentChains } from "../../helper-hardhat-config"
import { UniforgeDeployerV1, FailedWithdraw } from "../../typechain-types"
import { network, deployments, ethers } from "hardhat"
import { Address } from "hardhat-deploy/types"
import { expect } from "chai"
import { BigNumber } from "ethers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("UniforgeDeployerV1", function () {
          // Global variables
          let accounts: SignerWithAddress[]
          let deployer: SignerWithAddress
          let collectionCreator: SignerWithAddress
          let uniforgeDeployerV1: UniforgeDeployerV1
          let failedWithdraw: FailedWithdraw
          let args: [Address, string, string, string, BigNumber, number, number, number]

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              collectionCreator = accounts[1]
              await deployments.fixture(["deployer", "mock"])
              uniforgeDeployerV1 = await ethers.getContract("UniforgeDeployerV1", deployer.address) // This function object comes with a provider
              failedWithdraw = await ethers.getContract("FailedWithdraw", deployer.address) // This function object comes with a provider
              args = [
                  deployer.address,
                  "Dappenics",
                  "DAPE",
                  "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/",
                  ethers.utils.parseUnits("0.01", "ether"),
                  10000,
                  2,
                  1,
              ]
          })

          describe("constructor", () => {
              it("deployer becomes owner of this contract", async () => {
                  expect(await uniforgeDeployerV1.owner()).to.equal(deployer.address)
              })
          })
          describe("deployUniforgeCollection", () => {
              let response: any
              let receipt: any
              let newCollectionAddress: Address
              beforeEach(async () => {
                  response = await uniforgeDeployerV1.deployUniforgeCollection(...args)
                  receipt = await response.wait(1)
                  newCollectionAddress = receipt.logs[0].address
              })
              it("emits that a new collection has been created", async () => {
                  expect(response).to.emit(uniforgeDeployerV1, "NewCollectionCreated")
              })

              it("deployedCollectionsCounter adds 1 whenever a new collection is created", async () => {
                  const deployments: BigNumber = await uniforgeDeployerV1.getDeployments()
                  expect(deployments.toNumber()).to.equal(1)
              })
              it("the new collection is added to the mapping with deployedCollectionsCounter as an index", async () => {
                  const deployment: Address = await uniforgeDeployerV1.getDeployment(1)
                  expect(deployment).to.equal(newCollectionAddress)
              })

              it("fails when the payment is not sent with the request", async () => {
                  await uniforgeDeployerV1.setDeployFee(ethers.utils.parseUnits("0.01", "ether"))
                  expect(uniforgeDeployerV1.deployUniforgeCollection(...args)).to.be.revertedWith(
                      "NeedMoreETHSent"
                  )
              })
              it("fails when the payment is lower than the deployment fee", async () => {
                  await uniforgeDeployerV1.setDeployFee(ethers.utils.parseUnits("0.01", "ether"))
                  const amount = ethers.utils.parseUnits("0.005", "ether")
                  expect(
                      uniforgeDeployerV1.deployUniforgeCollection(...args, { value: amount })
                  ).to.be.revertedWith("NeedMoreETHSent")
              })
              it("succeeds when the payment is exactly the deployment fee", async () => {
                  const initialBalance = await deployer.getBalance()
                  await uniforgeDeployerV1.setDeployFee(ethers.utils.parseUnits("0.01", "ether"))

                  const amount = ethers.utils.parseUnits("0.01", "ether")
                  await uniforgeDeployerV1.deployUniforgeCollection(...args, { value: amount })

                  const finalBalance = await deployer.getBalance()
                  expect(finalBalance.lt(initialBalance))
              })

              it("succeeds when the payment is higher than the deployment fee", async () => {
                  const initialBalance = await deployer.getBalance()
                  await uniforgeDeployerV1.setDeployFee(ethers.utils.parseUnits("0.01", "ether"))

                  const amount = ethers.utils.parseUnits("1", "ether")
                  await uniforgeDeployerV1.deployUniforgeCollection(...args, { value: amount })

                  const finalBalance = await deployer.getBalance()
                  expect(finalBalance.lt(initialBalance))
              })
          })
          describe("setDeployFee", async () => {
              it("sets the deploy fee to a desired value", async () => {
                  await uniforgeDeployerV1.setDeployFee(ethers.utils.parseUnits("1", "ether"))
                  const deployFee = await uniforgeDeployerV1.getDeployFee()

                  const result = ethers.utils.parseUnits("1", "ether").eq(deployFee)
                  expect(result).to.be.true
              })
              it("reverts when different person tries to set the deploy fee", async () => {
                  const collectionCreatorConnected = uniforgeDeployerV1.connect(collectionCreator)
                  expect(
                      collectionCreatorConnected.setDeployFee(ethers.utils.parseUnits("1", "ether"))
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
              it("emits that a new deploy fee has been set", async () => {
                  const response = await uniforgeDeployerV1.setDeployFee(
                      ethers.utils.parseUnits("1", "ether")
                  )
                  expect(response).to.emit(uniforgeDeployerV1, "DeployFeeUpdated")
              })
          })

          describe("withdraw", () => {
              it("withdraws when called by owner", async () => {
                  const initialBalance = await deployer.getBalance()

                  // Deploy
                  const response: any = await uniforgeDeployerV1.deployUniforgeCollection(...args)
                  const receipt = await response.wait(1)
                  const gasUsedDeploy = receipt.gasUsed.mul(response.gasPrice)

                  // Withdraw
                  const txResponse: any = await uniforgeDeployerV1.withdraw()
                  const txReceipt = await txResponse.wait(1)
                  const gasUsedWithdraw = txReceipt.gasUsed.mul(txResponse.gasPrice)

                  const finalBalance = await deployer.getBalance()
                  const expectedBalance = finalBalance.add(gasUsedDeploy.add(gasUsedWithdraw))

                  expect(initialBalance).to.equal(expectedBalance)
              })
              it("reverts when different account tries to withdraw", async () => {
                  const collectionCreatorConnected = uniforgeDeployerV1.connect(collectionCreator)
                  expect(collectionCreatorConnected.withdraw()).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("failed call function is reverted", async () => {
                  // Transfer ownership to FailedWithdraw
                  await uniforgeDeployerV1.transferOwnership(failedWithdraw.address)
                  // Call failedCollection with uniforgeDeployerV1's address as argument
                  expect(
                      failedWithdraw.failedDeployer(uniforgeDeployerV1.address)
                  ).to.be.revertedWith("UniforgeDeployerV1__TransferFailed")
              })
          })

          describe("getDeployments", async () => {
              it("gets the amount of deployed collections", async () => {
                  await uniforgeDeployerV1.deployUniforgeCollection(...args)
                  const deployments = await uniforgeDeployerV1.getDeployments()
                  expect(deployments.toNumber()).to.equal(1)
              })
          })

          describe("getDeployment", async () => {
              it("gets the address of the deployed collections", async () => {
                  const response = await uniforgeDeployerV1.deployUniforgeCollection(...args)
                  const receipt = await response.wait(1)
                  const newCollectionAddress = receipt.logs[0].address

                  const deployment = await uniforgeDeployerV1.getDeployment(1)

                  expect(deployment).to.equal(newCollectionAddress)
              })
              it("reverts when index does not exist", async () => {
                  expect(uniforgeDeployerV1.getDeployment(30)).to.be.reverted // Panic
              })
          })

          describe("getDeployFee", () => {
              it("gets the value of the deployment fee", async () => {
                  await uniforgeDeployerV1.setDeployFee(ethers.utils.parseUnits("0.01", "ether"))

                  const deployFee = await uniforgeDeployerV1.getDeployFee()
                  const result = ethers.utils.parseUnits("0.01", "ether").eq(deployFee)
                  expect(result).to.be.true
              })
          })

          describe("Inherited Ownable functions", () => {
              describe("owner", () => {
                  it("gets the owner of the contract", async () => {
                      expect(await uniforgeDeployerV1.owner()).to.equal(deployer.address)
                  })
              })
              describe("renounceOwnership", () => {
                  it("renounces ownership of the contract", async () => {
                      await uniforgeDeployerV1.renounceOwnership()
                      expect(await uniforgeDeployerV1.owner()).to.equal(
                          "0x0000000000000000000000000000000000000000"
                      )
                  })
              })
              describe("transferOwnership", () => {
                  it("transfers ownership of the contract to an account", async () => {
                      await uniforgeDeployerV1.transferOwnership(collectionCreator.address)
                      expect(await uniforgeDeployerV1.owner()).to.equal(collectionCreator.address)
                  })
              })
          })
      })
