const LitJsSdk = require("@lit-protocol/lit-node-client");
const ethers = require("ethers");
const siwe = require("siwe");
const dotenv = require("dotenv");
dotenv.config();

async function main() {
    // Initialize LitNodeClient
    const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
        alertWhenUnauthorized: false,
        litNetwork: "cayenne",
        checkNodeAttestation: false,
        debug: false,
    });
    await litNodeClient.connect();

    let nonce = litNodeClient.getLatestBlockhash();

    // Initialize the signer
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const address = ethers.getAddress(await wallet.getAddress());

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
}

main();
