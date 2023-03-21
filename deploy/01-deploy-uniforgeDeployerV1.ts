import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import verify from "../utils/verify"

const deployUniforgeDeployer: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { getNamedAccounts, deployments, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    const _owner = deployer // this will be the vault

    // Deploy UniforgeDeployerV1 contract
    log("Deploying UniforgeDeployerV1 and waiting for confirmations...")
    const args: any[] = [_owner]
    const uniforgeDeployerV1 = await deploy("UniforgeDeployerV1", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations || 5,
    })
    log(`UniforgeDeployerV1 deployed at ${uniforgeDeployerV1.address}`)

    // Verify UniforgeDeployerV1 in Etherscan
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying UniforgeDeployerV1 contract")
        await verify(uniforgeDeployerV1.address, args)
        log("-----------------------------------------------")
    }
}

export default deployUniforgeDeployer

deployUniforgeDeployer.tags = ["all", "deployer", "deployer-collection"]
