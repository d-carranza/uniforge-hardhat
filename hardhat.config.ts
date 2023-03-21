import { HardhatUserConfig } from "hardhat/config"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-ethers"
import "hardhat-gas-reporter"
import "@typechain/hardhat"
import "solidity-coverage"
import "hardhat-deploy"
import "dotenv/config"

const {
    PRIVATE_KEY_TESTNET,
    MAINNET_RPC_URL,
    GOERLI_RPC_URL,
    BASE_GOERLI_RPC_URL,
    POLYGON_MUMBAI_RPC_URL,
    ARBITRUM_GOERLI_RPC_URL,
    OPTIMISM_GOERLI_RPC_URL,
    ETHERSCAN_API_KEY,
    POLYGONSCAN_API_KEY,
    ARBISCAN_API_KEY,
    OPTIMISM_ETHERSCAN_API_KEY,
    COINMARKETCAP_API_KEY,
} = process.env

const config: HardhatUserConfig = {
    solidity: { compilers: [{ version: "0.8.16" }] },
    defaultNetwork: "hardhat",
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545/",
            chainId: 31337,
        },
        mainnet: {
            url: MAINNET_RPC_URL,
            accounts: [],
            chainId: 1,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY_TESTNET!],
            chainId: 5,
        },
        basegoerli: {
            url: BASE_GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY_TESTNET!],
            chainId: 84531,
        },
        mumbai: {
            url: POLYGON_MUMBAI_RPC_URL,
            accounts: [PRIVATE_KEY_TESTNET!],
            chainId: 80001,
        },
        arbitrumgoerli: {
            url: ARBITRUM_GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY_TESTNET!],
            chainId: 421613,
        },
        optimismgoerli: {
            url: OPTIMISM_GOERLI_RPC_URL,
            accounts: [PRIVATE_KEY_TESTNET!],
            chainId: 420,
        },
    },
    gasReporter: {
        enabled: true,
        outputFile: "gas-report.txt",
        noColors: true,
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
    },
    etherscan: {
        apiKey: {
            mainnet: ETHERSCAN_API_KEY!,
            goerli: ETHERSCAN_API_KEY!,
            basegoerli: ETHERSCAN_API_KEY!,
            mumbai: POLYGONSCAN_API_KEY!,
            arbitrumgoerli: ARBISCAN_API_KEY!,
            optimismgoerli: OPTIMISM_ETHERSCAN_API_KEY!,
        },
        customChains: [
            {
                network: "mumbai",
                chainId: 80001,
                urls: {
                    // Polygonscan by Etherscan
                    apiURL: "https://api-testnet.polygonscan.com/api",
                    browserURL: "https://mumbai.polygonscan.com/",
                },
            },
            {
                network: "arbitrumgoerli",
                chainId: 421613,
                urls: {
                    // Arbiscan by Etherscan
                    apiURL: "https://api-goerli.arbiscan.io/api",
                    browserURL: "https://testnet.arbiscan.io/",
                },
            },
            {
                network: "optimismgoerli",
                chainId: 420,
                urls: {
                    // Arbiscan by Etherscan
                    apiURL: "https://api-goerli-optimistic.etherscan.io/api",
                    browserURL: "https://goerli-explorer.optimism.io",
                },
            },
            {
                network: "basegoerli",
                chainId: 84531,
                urls: {
                    // Pick a block explorer and uncomment those lines

                    // Blockscout
                    // apiURL: "https://base-goerli.blockscout.com/api",
                    // browserURL: "https://base-goerli.blockscout.com"

                    // Basescan by Etherscan
                    apiURL: "https://api-goerli.basescan.org/api",
                    browserURL: "https://goerli.basescan.org",
                },
            },
        ],
    },

    namedAccounts: {
        deployer: { default: 0 },
        user: { default: 1 },
    },
}

export default config
