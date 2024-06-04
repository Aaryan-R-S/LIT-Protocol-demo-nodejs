const LitJsSdk = require("@lit-protocol/lit-node-client-nodejs");
const express = require('express');

const app = express();

app.locals.litNodeClient = new LitJsSdk.LitNodeClientNodeJs({
  alertWhenUnauthorized: false,
  litNetwork: "cayenne",
});

async function startServer() {
  try {
    await app.locals.litNodeClient.connect();
    console.log('Connected to Lit network');
    // Start your server here
    app.listen(3010, () => {
      console.log('Server is running on port 3000');
    });
  } catch (error) {
    console.error('Error connecting to Lit network:', error);
  }
}

startServer();
