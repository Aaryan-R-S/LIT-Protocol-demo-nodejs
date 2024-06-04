import * as LitJsSdk from '@lit-protocol/lit-node-client'

const litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
    alertWhenUnauthorized: false,
    litNetwork: "cayenne",
    checkNodeAttestation: false,
    debug: true,
});

const litChain = "solanaDevnet"
await litNodeClient.connect()

    const authSig = await LitJsSdk.checkAndSignAuthMessage({
      chain: litChain,
    })

    const accs = [
      {
        method: 'getBalance',
        params: [':userAddress'],
        pdaParams: [],
        pdaInterface: { offset: 0, fields: {} },
        pdaKey: '',
        chain: litChain,
        returnValueTest: {
          key: '',
          comparator: '>=',
          value: '00000000', // equals 0.1 SOL
        },
      },
    ]

    const { ciphertext, dataToEncryptHash } = await LitJsSdk.encryptString(
      {
        chain: litChain,
        dataToEncrypt: 'this is a secret message',
        solRpcConditions: accs,
        authSig,
      },
      litNodeClient,
    )

    console.log({ ciphertext, dataToEncryptHash })

    const decryptedString = await LitJsSdk.decryptToString(
      {
        solRpcConditions: accs,
        ciphertext,
        dataToEncryptHash,
        authSig,
        chain: litChain,
      },
      litNodeClient,
    )

    console.log(decryptedString)

    await litNodeClient.disconnect()