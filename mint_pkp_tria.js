const { LitContracts } = require("@lit-protocol/contracts-sdk");
const { LitNodeClientNodeJs } = require("@lit-protocol/lit-node-client-nodejs");
const ethers = require("ethers");
const dotenv = require("dotenv");
dotenv.config();

const provider = new ethers.providers.JsonRpcProvider("https://chain-rpc.litprotocol.com/http");
let wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const mintPKP = async () => {
    const contractClient = new LitContracts({ signer: wallet });
    await contractClient.connect();
    
    const litNodeClient = new LitNodeClientNodeJs({
        alertWhenUnauthorized: false,
        litNetwork: "cayenne",
        debug: false,
    });
    await litNodeClient.connect();
    try {
        const mintCost = await contractClient.pkpNftContract.read.mintCost();
        const keyType = 2;
        const triaAuthMethodType = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Tria-auth'));
        const permittedAuthMethodTypes = [2, triaAuthMethodType];
        const permittedAuthMethodIds = [
            contractClient.utils.getBytesFromMultihash('QmRv5JAxLbJ4vRnQtQqY1CHCXJnxRRe2Ge9CSHwdcySZKr'),
            contractClient.utils.getBytesFromMultihash('QtQqY1CHCXJnxRrRe2Ge9CSHwdcy')
        ]
        const permittedAuthMethodPubkeys = ['0x', '0x'];
        const permittedAuthMethodScopes = [[1], [1]]

        console.log("ok1")
        const mockTransaction = await contractClient.pkpPermissionsContract.write.populateTransaction.addPermittedAuthMethod(
            permittedAuthMethodTypes,
            permittedAuthMethodIds,
            []
        );
        console.log("ok2")
        const gas = await contractClient.signer.estimateGas(mockTransaction);
        console.log("ok3")

        const mintTx = await contractClient.pkpHelperContract.write.mintNextAndAddAuthMethods(
            keyType,
            permittedAuthMethodTypes,
            permittedAuthMethodIds,
            permittedAuthMethodPubkeys,
            permittedAuthMethodScopes,
            true,
            true,
            { value: mintCost, gasPrice: ethers.utils.parseUnits("0.001", "gwei"), gasLimit: gas }
        );
        const mintTxReceipt = await mintTx.wait();

        const tokenId = mintTxReceipt.events[0].topics[1]
        console.log({ tokenId })
    } catch (err) {
        console.log(err);
    }
}

mintPKP();