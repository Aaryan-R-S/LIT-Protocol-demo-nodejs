const { LitContracts } = require("@lit-protocol/contracts-sdk");
const { LitNodeClientNodeJs } = require("@lit-protocol/lit-node-client-nodejs");
const { AuthMethodType } = require("@lit-protocol/constants");
const ethers = require("ethers");
const dotenv = require("dotenv");
dotenv.config();

// const https = require("https");
// const { create } = require("ssl-root-cas/latest");
// https.globalAgent.options.ca = create();

const siwe = require('siwe');
const {LitAuthClient} = require('@lit-protocol/lit-auth-client')

const mintPKP = async () => {
    const provider = new ethers.providers.JsonRpcProvider(
        "https://chain-rpc.litprotocol.com/http"
    );
    let wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log("ok1");

    const contractClient = new LitContracts({
        signer: wallet,
        network: "cayenne",
    });
    await contractClient.connect();
    console.log("ok2");

    const litNodeClient = new LitNodeClientNodeJs({
        alertWhenUnauthorized: false,
        litNetwork: "cayenne",
        debug: true,
    });
    await litNodeClient.connect();
    console.log("ok3");
    try {
        const mintCost = await contractClient.pkpNftContract.read.mintCost();

        let nonce = litNodeClient.getLatestBlockhash();

        const address = wallet.address;

        // Craft the SIWE message
        const domain = "localhost";
        const origin = "https://localhost/login";
        const statement =
            "This is a test statement.  You can put anything you want here.";
        const siweMessage = new siwe.SiweMessage({
            domain,
            address: address,
            statement,
            uri: origin,
            version: "1",
            chainId: 1,
            nonce,
        });
        const messageToSign = siweMessage.prepareMessage();

        // Sign the message and format the authSig
        const signature = await wallet.signMessage(messageToSign);

        const authSig = {
            sig: signature,
            derivedVia: "web3.eth.personal.sign",
            signedMessage: messageToSign,
            address: address,
        };

        console.log(authSig);

        const authMethod = {
            authMethodType: 1,
            accessToken: JSON.stringify(authSig),
        };

        const authId = LitAuthClient.getAuthIdByAuthMethod(authMethod);

        const triaAuthMethodType = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('Tria-auth'));
        const permittedAuthMethodTypes = [2, triaAuthMethodType];
        
        const permittedAuthMethodIds = [
            contractClient.utils.getBytesFromMultihash('QmRv5JAxLbJ4vRnQtQqY1CHCXJnxRRe2Ge9CSHwdcySZKr'),
            contractClient.utils.getBytesFromMultihash('QtQqY1CHCXJnxRrRe2Ge9CSHwdcy')
        ]

        console.log("ok4");
        const mintTx =
            await contractClient.pkpHelperContract.write.mintNextAndAddAuthMethods(
                2,
                permittedAuthMethodTypes,
                permittedAuthMethodIds ,
                ["0x", "0x"], // only for web3auth atm
                [[1], [1]],
                true, // addPkpEthAddressAsPermittedAddress,
                true, // sendPkpToItself,
                {
                    value: mintCost,
                    gasPrice: ethers.utils.parseUnits("0.001", "gwei"),
                    gasLimit: 4000000,
                }
            );
        console.log("ok5.1");
        const mintTxReceipt = await mintTx.wait();
        const tokenId = mintTxReceipt.events[0].topics[1];
        console.log("ok5.2");

        console.log({ tokenId });
    } catch (err) {
        console.log(err);
        console.log("ok6");
    }
};

mintPKP();
