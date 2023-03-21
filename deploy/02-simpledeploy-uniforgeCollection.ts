import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../utils/verify"
import { ethers } from "hardhat"

const deployUniforgeCollection: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { getNamedAccounts, deployments, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    // Deploy UniforgeCollection contract
    log("Deploying UniforgeCollection and waiting for confirmations...")
    const args: any[] = [
        deployer,
        "Dappenics",
        "DAPE",
        "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/",
        ethers.utils.parseUnits("0.01", "ether"),
        2,
        10,
        10000000,
    ]
    const uniforgeCollection = await deploy("UniforgeCollection", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations || 5,
    })
    log(`UniforgeCollection deployed at ${uniforgeCollection.address}`)

    // // Verify UniforgeCollection in Etherscan
    // if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    //     log("Verifying UniforgeCollection contract")
    //     await verify(uniforgeCollection.address, args)
    //     log("-----------------------------------------------")
    // }
}

export default deployUniforgeCollection

deployUniforgeCollection.tags = ["all", "collection"]
