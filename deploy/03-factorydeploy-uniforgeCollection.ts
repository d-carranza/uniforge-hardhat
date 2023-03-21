import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { UniforgeDeployerV1 } from "../typechain-types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"

const deployUniforgeFactoryCollection: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment
) {
    const { getNamedAccounts, deployments, network } = hre
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS
    const { deployer } = await getNamedAccounts()

    // Write default args for the constructor

    /*
    interface deployNewCollection(
        address _owner,
        string memory _name,
        string memory _symbol,
        string memory _baseURI,
        uint256 _mintFee,
        uint256 _maxMintAmount,
        uint256 _maxSupply,
        uint256 _startSale
        )
        */
    const _owner = deployer // this will be the collection's owner

    const args: any[] = [
        _owner,
        "Dappenics",
        "DAPE",
        "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/",
        ethers.utils.parseUnits("0.01", "ether"),
        2,
        10000,
        10000000,
    ]

    // Deploy UniforgeCollection contract from UniforgeDeployerV1 contract
    console.log("Deploying UniforgeCollection and waiting for confirmations...")
    const uniforgeDeployerV1: UniforgeDeployerV1 = await ethers.getContract(
        "UniforgeDeployerV1",
        deployer
    )

    const transactionResponse = await uniforgeDeployerV1.deployUniforgeCollection(
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
        args[7]
    )

    const transactionReceipt = await transactionResponse.wait(waitBlockConfirmations)
    const newUniforgeCollection = transactionReceipt.events![2].args![0]
    console.log(`UniforgeCollection deployed at ${newUniforgeCollection}`)

    // Verify UniforgeCollection in Etherscan
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        console.log("Verifying UniforgeCollection contract")
        await verify(newUniforgeCollection, args)
        console.log("-----------------------------------------------")
    }
}

export default deployUniforgeFactoryCollection

deployUniforgeFactoryCollection.tags = ["all", "deployer-collection"]
