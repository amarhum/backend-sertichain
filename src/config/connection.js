const ethers = require('ethers');

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const privateKey = process.env.PRIVATE_KEY;
const walletConnection = new ethers.Wallet(privateKey, provider);

module.exports = walletConnection;