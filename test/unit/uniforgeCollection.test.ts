import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { developmentChains } from "../../helper-hardhat-config"
import { UniforgeCollection, FailedWithdraw } from "../../typechain-types"
import { network, deployments, ethers } from "hardhat"
import { Address } from "hardhat-deploy/types"
import { expect } from "chai"
import { BigNumber } from "ethers"

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("UniforgeCollection", function () {
          // Global variables
          let accounts: SignerWithAddress[]
          let deployer: SignerWithAddress
          let collectionCollector: SignerWithAddress
          let uniforgeCollection: UniforgeCollection
          let failedWithdraw: FailedWithdraw
          let args: [Address, string, string, string, BigNumber, number, number, number]

          /* Constructor args: */
          // const argsOwner = deployer
          const argsName = "Dappenics"
          const argsSymbol = "DAPE"
          const argsBaseURI = "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/"
          const argsMintFee = ethers.utils.parseUnits("0.01", "ether")
          const argsMaxMintAmount = 2
          const argsMaxSupply = 10
          const argsStartSale = 10000000

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              collectionCollector = accounts[1]
              await deployments.fixture(["collection", "mock"])
              uniforgeCollection = await ethers.getContract("UniforgeCollection", deployer.address)
              failedWithdraw = await ethers.getContract("FailedWithdraw", deployer.address)
          })

          describe("constructor", () => {
              it('"owner" from constructor args becomes the owner of this contract', async () => {
                  const owner: Address = await uniforgeCollection.owner()
                  expect(owner).to.equal(deployer.address)
              })

              it("provided baseURI is stored in storage", async () => {
                  const baseURI: string = await uniforgeCollection.getBaseURI()
                  expect(baseURI).to.equal(argsBaseURI)
              })

              it("provided mintFee is stored in the bytecode", async () => {
                  const mintFee: BigNumber = await uniforgeCollection.getMintFee()
                  expect(mintFee).to.equal(argsMintFee)
              })

              it("provided maxMintAmount is stored in storage", async () => {
                  const maxMintAmount: BigNumber = await uniforgeCollection.getMaxMintAmount()
                  expect(maxMintAmount.toNumber()).to.equal(argsMaxMintAmount)
              })

              it("provided maxSupply is stored in the bytecode", async () => {
                  const maxSupply: BigNumber = await uniforgeCollection.getMaxSupply()
                  expect(maxSupply.toNumber()).to.equal(argsMaxSupply)
              })

              it("provided startSale is stored in storage", async () => {
                  const startSale: BigNumber = await uniforgeCollection.getStartSale()
                  expect(startSale.toNumber()).to.equal(argsStartSale)
              })
          })

          describe("mintNft", () => {
              it("mints NFT when mint amount is equal to max mint amount", async () => {
                  await uniforgeCollection.mintNft(argsMaxMintAmount, {
                      value: argsMintFee.mul(argsMaxMintAmount),
                  })
                  expect(await uniforgeCollection.totalSupply()).to.equal(argsMaxMintAmount)
              })

              it("mints NFT when mint amount is less to max mint amount", async () => {
                  await uniforgeCollection.mintNft(1, { value: argsMintFee })
                  expect(await uniforgeCollection.totalSupply()).to.equal(1)
              })

              it("reverts when mint amount is more than max mint amount", async () => {
                  expect(
                      uniforgeCollection.mintNft(3, {
                          value: argsMintFee.mul(3),
                      })
                  ).to.be.revertedWith("UniforgeCollection__InvalidMintAmount")
              })

              it("reverts when mint amount is negative (error: out of bound)", async () => {
                  expect(
                      uniforgeCollection.mintNft(-1, {
                          value: argsMintFee,
                      })
                  ).to.be.reverted
              })

              it("reverts when mint amount is zero", async () => {
                  expect(
                      uniforgeCollection.mintNft(0, {
                          value: argsMintFee,
                      })
                  ).to.be.revertedWith("UniforgeCollection__InvalidMintAmount")
              })

              it("reverts when the sale is not open", async () => {
                  await uniforgeCollection.setStartSale(3000000000000000)
                  expect(
                      uniforgeCollection.mintNft(1, {
                          value: argsMintFee,
                      })
                  ).to.be.revertedWith("UniforgeCollection__SaleIsNotOpen")
              })

              it("reverts when the payment is zero", async () => {
                  expect(uniforgeCollection.mintNft(1)).to.be.revertedWith(
                      "UniforgeCollection__NeedMoreETHSent"
                  )
              })

              it("reverts when the payment is zero", async () => {
                  const payment = ethers.utils.parseUnits("0.005", "ether")
                  expect(uniforgeCollection.mintNft(1, { value: payment })).to.be.revertedWith(
                      "UniforgeCollection__NeedMoreETHSent"
                  )
              })

              it("mints NFT when the payment is higher than the mint fee", async () => {
                  await uniforgeCollection.mintNft(1, { value: argsMintFee.add(argsMintFee) })
                  expect(await uniforgeCollection.totalSupply()).to.equal(1)
              })
              it("mints when the max supply is increased", async () => {
                  // max the supply
                  await uniforgeCollection.setMaxSupply(2)
                  await uniforgeCollection.mintNft(2, { value: argsMintFee.mul(2) })

                  // expects the mint to revert for token 3
                  expect(uniforgeCollection.mintNft(1, { value: argsMintFee })).to.be.revertedWith(
                      "UniforgeCollection__MaxSupplyExceeded"
                  )

                  // increase the supply
                  await uniforgeCollection.setMaxSupply(3)

                  // mint aditional token
                  await uniforgeCollection.mintNft(1, { value: argsMintFee })

                  // expects totakSupply to be 3
                  expect(await uniforgeCollection.totalSupply()).to.equal(3)
              })

              it("reverts when the max supply is lower than the total supply", async () => {
                  // Mint 2 tokens
                  await uniforgeCollection.mintNft(2, { value: argsMintFee.mul(2) })

                  // set max supply lower than minted tokens
                  await uniforgeCollection.setMaxSupply(1)

                  // expects the mint to revert
                  expect(uniforgeCollection.mintNft(1, { value: argsMintFee })).to.be.revertedWith(
                      "UniforgeCollection__MaxSupplyExceeded"
                  )
              })
          })

          describe("mintForAddress", () => {
              it("owner mints free NFT to himself", async () => {
                  await uniforgeCollection.mintForAddress(1, deployer.address)
                  expect(await uniforgeCollection.ownerOf(0)).to.equal(deployer.address)
              })

              it("owner mints free NFT to other account", async () => {
                  await uniforgeCollection.mintForAddress(1, collectionCollector.address)
                  expect(await uniforgeCollection.ownerOf(0)).to.equal(collectionCollector.address)
              })

              it("owner mints more than max mint amount free NFT in the same tx", async () => {
                  await uniforgeCollection.mintForAddress(5, deployer.address)
                  expect(await uniforgeCollection.totalSupply()).to.equal(5)
              })

              it("different account cant call this function", async () => {
                  const collectionCollectorConnected =
                      uniforgeCollection.connect(collectionCollector)
                  expect(
                      collectionCollectorConnected.mintForAddress(1, collectionCollector.address)
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })

              it("can mint 1 token when supply is 9/10", async () => {
                  await uniforgeCollection.mintForAddress(9, deployer.address)
                  await uniforgeCollection.mintForAddress(1, deployer.address)
                  expect(await uniforgeCollection.getMaxSupply()).to.equal(10)
              })

              it("can't mint 2 tokens when supply is 9/10", async () => {
                  await uniforgeCollection.mintForAddress(9, deployer.address)
                  expect(uniforgeCollection.mintForAddress(2, deployer.address)).to.be.revertedWith(
                      "UniforgeCollection__MaxSupplyExceeded"
                  )
              })

              it("can't mint 1 token when supply is 10/10", async () => {
                  await uniforgeCollection.mintForAddress(10, deployer.address)
                  expect(uniforgeCollection.mintForAddress(1, deployer.address)).to.be.revertedWith(
                      "UniforgeCollection__MaxSupplyExceeded"
                  )
              })

              it("can't mint 11 tokens when supply is 0/10", async () => {
                  expect(
                      uniforgeCollection.mintForAddress(11, deployer.address)
                  ).to.be.revertedWith("UniforgeCollection__MaxSupplyExceeded")
              })
              it("mints when the max supply is increased", async () => {
                  // max the supply
                  await uniforgeCollection.setMaxSupply(2)
                  await uniforgeCollection.mintForAddress(2, deployer.address)

                  // expects the mint to revert for token 3
                  await expect(
                      uniforgeCollection.mintForAddress(1, deployer.address)
                  ).to.be.revertedWith("UniforgeCollection__MaxSupplyExceeded")

                  // increase the supply
                  await uniforgeCollection.setMaxSupply(3)

                  // mint aditional token
                  await uniforgeCollection.mintForAddress(1, deployer.address)

                  // expects totakSupply to be 3
                  expect(await uniforgeCollection.totalSupply()).to.equal(3)
              })
              it("reverts when the max supply is lower than the total supply", async () => {
                  // Mint 2 tokens
                  await uniforgeCollection.mintForAddress(2, deployer.address)

                  // set max supply lower than minted tokens
                  await uniforgeCollection.setMaxSupply(1)

                  // expects the mint to revert
                  expect(uniforgeCollection.mintForAddress(1, deployer.address)).to.be.revertedWith(
                      "UniforgeCollection__MaxSupplyExceeded"
                  )
              })
          })
          describe("setBaseURI", () => {
              it("sets the base URI to a desired value", async () => {
                  await uniforgeCollection.setBaseURI("http://dapponics.io")
                  expect(await uniforgeCollection.getBaseURI()).to.equal("http://dapponics.io")
              })

              it("reverts when other account tries to set the base URI", async () => {
                  const collectionCollectorConnected =
                      uniforgeCollection.connect(collectionCollector)
                  expect(
                      collectionCollectorConnected.setBaseURI("http://dapponics.io")
                  ).to.be.revertedWith("Ownable: caller is not the owner")
              })
          })
          describe("setMintFee", () => {
              it("sets the mint fee to a desired value", async () => {
                  const newMintFee = ethers.utils.parseUnits("0.02", "ether")
                  await uniforgeCollection.setMintFee(newMintFee)
                  expect((await uniforgeCollection.getMintFee()).toString()).to.equal(
                      newMintFee.toString()
                  )
              })

              it("reverts when other account tries to set the mint fee", async () => {
                  const newMintFee = ethers.utils.parseUnits("0.02", "ether")
                  const collectionCollectorConnected =
                      uniforgeCollection.connect(collectionCollector)
                  expect(collectionCollectorConnected.setMintFee(newMintFee)).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("emits that a new mint fee has been set", async () => {
                  const response = await uniforgeCollection.setMintFee(
                      ethers.utils.parseUnits("1", "ether")
                  )
                  expect(response).to.emit(uniforgeCollection, "MintFeeUpdated")
              })
          })
          describe("setMaxMintAmountPerTx", () => {
              it("sets the maximum amount of mintable tokens per transaction to a desired value", async () => {
                  await uniforgeCollection.setMaxMintAmount(5)
                  expect((await uniforgeCollection.getMaxMintAmount()).toNumber()).to.equal(5)
              })

              it("reverts when other account tries to set the max mint amount", async () => {
                  const collectionCollectorConnected =
                      uniforgeCollection.connect(collectionCollector)
                  expect(collectionCollectorConnected.setMaxMintAmount(5)).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("emits that a new max mint amount has been set", async () => {
                  const response = await uniforgeCollection.setMaxMintAmount(5)
                  expect(response).to.emit(uniforgeCollection, "MaxMintAmountUpdated")
              })
          })
          describe("setMaxSupply", () => {
              it("sets the maximum supply to a desired value", async () => {
                  await uniforgeCollection.setMaxSupply(10100)
                  expect(await uniforgeCollection.getMaxSupply()).to.equal(10100)
              })

              it("reverts when other account tries to set the maximum supply", async () => {
                  const collectionCollectorConnected =
                      uniforgeCollection.connect(collectionCollector)
                  expect(collectionCollectorConnected.setMaxSupply(10100)).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("emits that a new maximum supply has been set", async () => {
                  const response = await uniforgeCollection.setMaxSupply(10200)
                  expect(response).to.emit(uniforgeCollection, "MaxSupplyUpdated")
              })
          })
          describe("setStartSale", () => {
              it("sets the starting timestamp of the sale to a desired value", async () => {
                  await uniforgeCollection.setStartSale(17000000)
                  expect((await uniforgeCollection.getStartSale()).toNumber()).to.equal(17000000)
              })

              it("reverts when other account tries to set the start sale", async () => {
                  const collectionCollectorConnected =
                      uniforgeCollection.connect(collectionCollector)
                  expect(collectionCollectorConnected.setStartSale(17000000)).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
              it("emits that a new start sale date has been set", async () => {
                  const response = await uniforgeCollection.setStartSale(170000000)
                  expect(response).to.emit(uniforgeCollection, "StartSaleUpdated")
              })
          })
          describe("withdraw", () => {
              it("withdraws when called by owner", async () => {
                  const initialBalance = await deployer.getBalance()

                  // MintNft
                  const response: any = await uniforgeCollection.mintNft(1, { value: argsMintFee })
                  const receipt = await response.wait(1)
                  const gasUsedMint = receipt.gasUsed.mul(response.gasPrice)

                  // Withdraw
                  const txResponse: any = await uniforgeCollection.withdraw()
                  const txReceipt = await txResponse.wait(1)
                  const gasUsedWithdraw = txReceipt.gasUsed.mul(txResponse.gasPrice)

                  // Check balances
                  const finalBalance = await deployer.getBalance()
                  const expectedBalance = finalBalance.add(gasUsedMint.add(gasUsedWithdraw))

                  expect(expectedBalance).to.equal(initialBalance)
              })

              it("reverts when called by other account", async () => {
                  const collectionCollectorConnected =
                      uniforgeCollection.connect(collectionCollector)
                  expect(collectionCollectorConnected.withdraw()).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })

              it("reverts when transfer call fails", async () => {
                  // Give Ownership to FailedWithdrawMock
                  await uniforgeCollection.transferOwnership(failedWithdraw.address)
                  // call failedCollection with uniforgeCollection address as args
                  expect(
                      failedWithdraw.failedCollection(uniforgeCollection.address)
                  ).to.be.revertedWith("UniforgeCollection__TransferFailed")
              })
          })

          describe("getMaxSupply", () => {
              it("reads the max supply", async () => {
                  expect(await uniforgeCollection.getMaxSupply()).to.equal(argsMaxSupply)
              })
          })
          describe("getMintFee", () => {
              it("reads the mint fee", async () => {
                  expect(await uniforgeCollection.getMintFee()).to.equal(argsMintFee)
              })
          })
          describe("getMaxMintAmount", () => {
              it("reads the max mint amount", async () => {
                  expect(await uniforgeCollection.getMaxMintAmount()).to.equal(argsMaxMintAmount)
              })
          })
          describe("getStartSale", () => {
              it("reads the start sale", async () => {
                  expect(await uniforgeCollection.getStartSale()).to.equal(argsStartSale)
              })
          })
          describe("getBaseURI", () => {
              it("reads the base URI", async () => {
                  expect(await uniforgeCollection.getBaseURI()).to.equal(argsBaseURI)
              })
          })
          describe("getTokenURI", () => {
              it("reads the tokenURI", async () => {
                  const num: number = 1
                  await uniforgeCollection.mintNft(num, {
                      value: argsMintFee.mul(num),
                  })
                  expect(await uniforgeCollection.tokenURI(0)).to.equal(argsBaseURI + "0")
              })
              it("reverts when asked tokenURI is lower than zero", async () => {
                  await uniforgeCollection.mintNft(1, { value: argsMintFee })
                  expect(uniforgeCollection.tokenURI(-1)).to.be.reverted
              })
              it("reverts when asked tokenURI is equal to total supply", async () => {
                  await uniforgeCollection.mintNft(1, {
                      value: argsMintFee,
                  })
                  expect(await uniforgeCollection.totalSupply()).to.equal(1)
                  expect(uniforgeCollection.tokenURI(1)).to.be.revertedWith("NonexistentToken")
              })
              it("reverts when asked tokenURI is higher than total supply", async () => {
                  await uniforgeCollection.mintNft(1, {
                      value: argsMintFee,
                  })
                  expect(uniforgeCollection.tokenURI(2)).to.be.revertedWith("NonexistentToken")
              })
          })
          describe("Inherited Ownable Functions", () => {
              describe("owner", () => {
                  it("gets the owner of the contract", async () => {
                      expect(await uniforgeCollection.owner()).to.equal(deployer.address)
                  })
              })
              describe("renounceOwnership", () => {
                  it("renounces ownership of the contract", async () => {
                      await uniforgeCollection.renounceOwnership()
                      expect(await uniforgeCollection.owner()).to.equal(
                          "0x0000000000000000000000000000000000000000"
                      )
                  })
              })
              describe("transferOwnership", () => {
                  it("transfers ownership of the contract to an account", async () => {
                      await uniforgeCollection.transferOwnership(collectionCollector.address)
                      expect(await uniforgeCollection.owner()).to.equal(collectionCollector.address)
                  })
              })
          })

          describe("Inherited ERC721Enumerable Functions", () => {
              describe("supportsInterface", () => {
                  it("returns true", async () => {
                      expect(await uniforgeCollection.supportsInterface("0x780e9d63")).to.equal(
                          true
                      )
                  })
              })
              describe("tokenOfOwnerByIndex", () => {
                  it("returns the number of tokens that a holder has", async () => {
                      await uniforgeCollection.mintNft(2, { value: argsMintFee.mul(2) })
                      expect(
                          await uniforgeCollection.tokenOfOwnerByIndex(deployer.address, 0)
                      ).to.equal(0)
                  })
              })
              describe("totalSupply", () => {
                  it("reads the total supply", async () => {
                      await uniforgeCollection.mintNft(1, { value: argsMintFee })
                      expect(await uniforgeCollection.totalSupply()).to.equal(1)
                  })
              })
              describe("tokenByIndex", () => {
                  it("returns token n by index (n)", async () => {
                      await uniforgeCollection.mintNft(1, { value: argsMintFee })
                      expect((await uniforgeCollection.tokenByIndex(0)).toNumber()).to.equal(0)
                  })
              })
              describe("Inherited ERC721 Functions", () => {
                  describe("balanceOf", () => {
                      it("returns the balance", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          expect(await uniforgeCollection.balanceOf(deployer.address)).to.equal(1)
                      })
                  })
                  describe("ownerOf", () => {
                      it("returns the owner of a specific token", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          expect(await uniforgeCollection.ownerOf(0)).to.equal(deployer.address)
                      })
                  })
                  describe("name", () => {
                      it("returns the name of the collection", async () => {
                          expect(await uniforgeCollection.name()).to.equal(argsName)
                      })
                  })
                  describe("symbol", () => {
                      it("returns the symbol of the collection", async () => {
                          expect(await uniforgeCollection.symbol()).to.equal(argsSymbol)
                      })
                  })
                  describe("tokenURI", () => {
                      it("reads the tokenURI", async () => {
                          await uniforgeCollection.mintNft(1, {
                              value: argsMintFee,
                          })
                          expect(await uniforgeCollection.tokenURI(0)).to.equal(argsBaseURI + "0")
                      })

                      it("reverts when asked tokenURI in not existent token", async () => {
                          await uniforgeCollection.mintNft(1, {
                              value: argsMintFee,
                          })
                          expect(uniforgeCollection.tokenURI(2)).to.be.revertedWith(
                              "NonexistentToken"
                          )
                      })

                      it("reverts when asked tokenURI is zero", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          expect(uniforgeCollection.tokenURI(0)).to.be.revertedWith(
                              "NonexistentToken"
                          )
                      })
                  })
                  describe("approve", () => {
                      it("approves other account to manage one token", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          await uniforgeCollection.approve(collectionCollector.address, 0)
                          expect(await uniforgeCollection.getApproved(0)).to.equal(
                              collectionCollector.address
                          )
                      })
                  })
                  describe("getApproved", () => {
                      it("returns an address for a given token", () => {
                          it("approves other account to manage one token", async () => {
                              await uniforgeCollection.mintNft(1, { value: argsMintFee })
                              await uniforgeCollection.approve(collectionCollector.address, 1)
                              expect(await uniforgeCollection.getApproved(1)).to.equal(
                                  collectionCollector.address
                              )
                          })
                      })
                  })
                  describe("setApprovalForAll", () => {
                      it("approves other account to manage all the tokens from this collection", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          await uniforgeCollection.setApprovalForAll(
                              collectionCollector.address,
                              true
                          )
                          expect(
                              await uniforgeCollection.isApprovedForAll(
                                  deployer.address,
                                  collectionCollector.address
                              )
                          ).to.equal(true)
                      })
                  })

                  describe("isApprovedForAll", () => {
                      it("returns a boolean after inputing the owner and the operator", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          expect(
                              await uniforgeCollection.isApprovedForAll(
                                  deployer.address,
                                  collectionCollector.address
                              )
                          ).to.equal(false) // In this case operator is not approved so it returns false
                      })
                  })
                  describe("transferFrom", () => {
                      it("transfers the token to a different account", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          await uniforgeCollection.transferFrom(
                              deployer.address,
                              collectionCollector.address,
                              0
                          )
                          expect(await uniforgeCollection.ownerOf(0)).to.equal(
                              collectionCollector.address
                          )
                      })
                  })
                  describe("safeTransferFrom", () => {
                      it("transfers the toke making sure it can be received", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          await uniforgeCollection["safeTransferFrom(address,address,uint256)"](
                              deployer.address,
                              collectionCollector.address,
                              0
                          )
                          expect(await uniforgeCollection.ownerOf(0)).to.equal(
                              collectionCollector.address
                          )
                      })
                  })
                  describe("safeTransferFrom", () => {
                      it("transfers the toke making sure it can be received (including data payload)", async () => {
                          await uniforgeCollection.mintNft(1, { value: argsMintFee })
                          const data = ethers.utils.toUtf8Bytes("This is an awesome unit test")
                          await uniforgeCollection[
                              "safeTransferFrom(address,address,uint256,bytes)"
                          ](deployer.address, collectionCollector.address, 0, data)
                          expect(await uniforgeCollection.ownerOf(0)).to.equal(
                              collectionCollector.address
                          )
                      })
                  })
              })
          })
      })
