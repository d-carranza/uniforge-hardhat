<p align="center"><img src= "https://raw.githubusercontent.com/dapponics/uniforge/main/brand-assets/logos/png/Logo%20light.png" width="620" alt="Uniforge"></p>




# Uniforge backend initialization guide (public version)
### 1. Clone this repository:
```
git clone git@github.com:d-carranza/dapponics-uniforge.git
```

### 2. Install modules:
```
yarn
```

### 3. Setup the environment private keys and endpoints in .env

### 4. Compile the contracts:
```
yarn compile
```

### 5. Run tests:

#### unit tests, staging tests & gas report
>expected 95 passing
```
yarn test
```

#### staging tests only
>expected 1 passing
```
yarn test:staging
```

#### coverage
>expected 100%
```
yarn coverage
```

#### linter
>require solhint
```
yarn lint
```

#### slither 
>require python3, pip3, solc-select and slither-analyze
```
yarn slither
```

#### mythril
>require python3, pip3 and mythril
```
myth analyze <solidity-file>
```

### 6. Quick deploy in EVM compatible chains: 

#### testnets
```
yarn deploy:goerli
yarn deploy:base
yarn deploy:mumbai
yarn deploy:arbitrum
yarn deploy:optimism
```


