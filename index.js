// import path from 'path';
// import { success, fail, testThis } from '../../tools/scripts/utils.mjs';
// import LITCONFIG from '../../lit.config.json' assert { type: 'json' };
import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { LitContracts } from '@lit-protocol/contracts-sdk';
import { ethers } from 'ethers';
import { AuthMethodType, AuthMethodScope } from '@lit-protocol/constants';
import { LitAuthClient } from '@lit-protocol/lit-auth-client';
import * as siwe from 'siwe';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  // ========== Controller Setup ===========
  const provider = new ethers.providers.JsonRpcProvider(
    "https://chain-rpc.litprotocol.com/http"
  );

  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY,
    provider
  );

  // ==================== LitContracts Setup ====================
  const contractClient = new LitContracts({
    signer: wallet,
  });

  await contractClient.connect();

  // ==================== Test Logic ====================

  const address = ethers.utils.getAddress(await wallet.getAddress());

  // Craft the SIWE message
  const litNodeClient = new LitJsSdk.LitNodeClient({
    litNetwork: 'cayenne',
    debug: false,
  });

  await litNodeClient.connect();

  let nonce = litNodeClient.getLatestBlockhash();
  console.log('GENERATED NONCE: ', nonce);

  const domain = 'localhost';
  const origin = 'https://localhost/login';
  const statement =
    'This is a test statement.  You can put anything you want here.';
  const siweMessage = new siwe.SiweMessage({
    domain,
    address: address,
    statement,
    uri: origin,
    version: '1',
    chainId: 1,
    nonce,
    expirationTime: new Date(Date.now() + 1000 * 60).toISOString(),
  });
  const messageToSign = siweMessage.prepareMessage();
  console.log('MESSAGE TO SIGN: ', messageToSign)

  // Sign the message and format the authSig
  const signature = await wallet.signMessage(messageToSign);

  const authSig = {
    sig: signature,
    derivedVia: 'web3.eth.personal.sign',
    signedMessage: messageToSign,
    address: address,
  };

  console.log('AUTH SIG: ', authSig);  

  const authMethod = {
    authMethodType: AuthMethodType.EthWallet,
    accessToken: JSON.stringify(authSig),
  };

  const mintInfo = await contractClient.mintWithAuth({
    authMethod,
    scopes: [
      // AuthMethodScope.NoPermissions,
      AuthMethodScope.SignAnything,
      AuthMethodScope.OnlySignMessages,
    ],
  });

  console.log(`mintInfo: ${JSON.stringify(mintInfo)}`);
  
  if (!mintInfo.tx.transactionHash) {
    console.log(`failed to mint a PKP`);
  }

  const authId = LitAuthClient.getAuthIdByAuthMethod(authMethod);

  // ==================== Post-Validation ====================
  // NOTE: When using other auth methods, you might need to wait for a block to be mined before you can read the scopes
  // -- get the scopes
  const scopes =
    await contractClient.pkpPermissionsContract.read.getPermittedAuthMethodScopes(
      mintInfo.pkp.tokenId,
      AuthMethodType.EthWallet,
      authId,
      3
    );

  const signAnythingScope = scopes[1];
  const onlySignMessagesScope = scopes[2];

  if (!signAnythingScope) {
    console.log(`signAnythingScope should be true`);
  }

  if (!onlySignMessagesScope) {
    console.log(`onlySignMessagesScope should be true`);
  }

  // ==================== Success ====================
  console.log(`ContractsSDK mints a PKP and set scope 1 and 2
Logs:
---
tokenId: ${mintInfo.pkp.tokenId}
transactionHash: ${mintInfo.tx.transactionHash}
signAnythingScope: ${signAnythingScope}
onlySignMessagesScope: ${onlySignMessagesScope}
`);
}

main();