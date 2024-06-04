import {
//     LitAuthClient,
//     StytchOtpProvider,
//     StytchAuthFactorOtpProvider
} from "@lit-protocol/lit-auth-client/src/index.js";
// import prompts from "prompts";
// import * as stytch from "stytch";
import { LitNodeClientNodeJs } from "@lit-protocol/lit-node-client-nodejs";
// import { ProviderType } from "@lit-protocol/constants";
// import { LitAbility, LitPKPResource, LitActionResource } from "@lit-protocol/auth-helpers";
// import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import * as ethers from 'ethers';
import * as siwe from 'siwe';
import * as dotenv from 'dotenv';
dotenv.config();
  
  //@ts-ignore
const ls = await import('node-localstorage');

const run = async()=>{
  const provider = new ethers.ethers.providers.JsonRpcProvider("https://chain-rpc.litprotocol.com/http");
  const wallet = new ethers.ethers.Wallet(process.env.PRIVATE_KEY, provider);
  // const address = ethers.getAddress(await wallet.getAddress());
  const address = wallet.address;
    
    const litNodeClient = new LitNodeClientNodeJs({
        litNetwork: "cayenne",
        debug: false,
        storageProvider: {
          provider: new ls.LocalStorage('./storage.db')
        }
    });
    await litNodeClient.connect();


    // const address = ethers.getAddress(await wallet.getAddress());

  // Craft the SIWE message
  const domain = 'localhost';
  const origin = 'https://localhost/login';
  const statement =
    'This is a test statement.  You can put anything you want here.';
    
  // expiration time in ISO 8601 format.  This is 7 days in the future, calculated in milliseconds
  const expirationTime = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7 * 10000
  ).toISOString();
  
  const siweMessage = new siwe.SiweMessage({
    domain,
    address: address,
    statement,
    uri: origin,
    version: '1',
    chainId: 1,
    nonce:litNodeClient.getLatestBlockhash(),
    // expirationTime,
  });
  const messageToSign = siweMessage.prepareMessage();
  
  // Sign the message and format the authSig
  const signature = await wallet.signMessage(messageToSign);

  const authSig = {
    sig: signature,
    derivedVia: 'web3.eth.personal.sign',
    signedMessage: messageToSign,
    address: address,
  };

  console.log(authSig);

    const computeCFAFromUserID = async(userId)=>{
        console.log('UserId: ', userId);
        const keyId = litNodeClient.computeHDKeyId(
          userId,
          "sdfg",
          true,
        );
        const publicKey = litNodeClient.computeHDPubKey(keyId.slice(2));
        const pubKeyBuffer = Buffer.from(publicKey, 'hex');
        console.log('PubKeyBuffer: ', pubKeyBuffer);
        const ethAddress = ethers.computeAddress(pubKeyBuffer);
        return {
          keyId: keyId,
          publicKey: publicKey,
          ethAddress: ethAddress,
        };
      }
      
      const claimKeyId = async(userId, authId) => {
    
        // const res = await litNodeClient.executeJs({
        //   authSig,
        //   code: `(async () => {
        //     Lit.Actions.claimKey({keyId: userId});
        //   })();`,
        //   jsParams: {
        //     userId: userId,
        //   },
        // });

        let contractClient = new LitContracts({signer:wallet, provider:provider});
        await contractClient.connect();
    

        const mintCost = await contractClient.pkpNftContract.read.mintCost();
        console.log('MintCost: ', mintCost);
        const tx =
          await contractClient.pkpHelperContract.write.claimAndMintNextAndAddAuthMethods(
            {
              keyType: 2,
              derivedKeyId: `0x${res.claims[userId].derivedKeyId}`,
              signatures: res.claims[userId].signatures,
            },
            {
              keyType: 2,
              permittedIpfsCIDs: [],
              permittedIpfsCIDScopes: [],
              permittedAddresses: [],
              permittedAddressScopes: [],
              permittedAuthMethodTypes: [9],
              permittedAuthMethodIds: [authId],
              permittedAuthMethodPubkeys: [`0x`],
              permittedAuthMethodScopes: [[BigNumber.from('1')]],
              addPkpEthAddressAsPermittedAddress: true,
              sendPkpToItself: true,
            },
            {
              value: mintCost,
            }
          );
        return tx;
      }

      const authMethodWallet = {
        authMethodType: 1, // Adjust based on the auth method
        accessToken: JSON.stringify(authSig),  // Use authSig obtained from the controller wallet
      };

      const authId = await LitAuthClient.getAuthIdByAuthMethod(authMethodWallet);
      console.log('AuthId: ', authId);

      const tx = await claimKeyId('userId', authId);
        console.log(tx);

      const receipt = await tx.wait();
        console.log(receipt);

      const {keyId, publicKey, ethAddress} = await computeCFAFromUserID('userId');
        console.log({keyId, publicKey, ethAddress});
    
}

run();