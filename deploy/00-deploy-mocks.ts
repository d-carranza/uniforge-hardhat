import { developmentChains, VERIFICATION_BLOCK_CONFIRMATIONS } from "../helper-hardhat-config"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"

const deployFailedWithdraw: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { getNamedAccounts, deployments, network } = hre
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const waitBlockConfirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS

    // Deploy FailedWithdraw contract
    log("Deploying FailedWithdraw and waiting for confirmations...")
    const args: any[] = []
    const failedWithdraw = await deploy("FailedWithdraw", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: waitBlockConfirmations || 5,
    })
    log(`FailedWithdraw deployed at ${failedWithdraw.address}`)
}

export default deployFailedWithdraw

deployFailedWithdraw.tags = ["all", "mock"]
