require("dotenv").config();
const walletConnection = require("../config/connection");
const { ethers } = require("ethers");

const contractABI = [
  {
    "inputs": [{ "internalType": "bytes32", "name": "hashedData", "type": "bytes32" }],
    "name": "storeCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "hashedData", "type": "bytes32" }],
    "name": "verifyCertificate",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, walletConnection);

const findTransactionWithHash = async (hashedData) => {
  try {
    const exists = await contract.verifyCertificate(hashedData);
    if (exists) {
      console.log(`Hash ditemukan di blockchain: ${hashedData}`);
      return true;
    }
    console.log("Hash belum ditemukan di blockchain.");
    return false;
  } catch (error) {
    console.error("Error saat verifikasi hash:", error);
    return true;
  }
};

const sendTransactionForRegister = async (userData) => {
  try {

    const exists = await findTransactionWithHash(userData);
    if (exists) {
      console.log("User already exists on the blockchain. Registration cancelled.");
      return { 
        message: "User already exists",
       };
    }
    
    console.log("Mengirim transaksi ke smart contract...");
    const txResponse = await contract.storeCertificate(userData);
    console.log("Transaction sent, waiting for confirmation:", txResponse.hash);

    const txReceipt = await txResponse.wait();
    console.log("Transaction mined:", txReceipt);

    return { 
      message: "Transaction sent successfully", 
      txHash: txResponse.hash, 
      receipt: txReceipt 
    };
  } catch (error) {
    console.error("Error saat mengirim transaksi:", error);
    return { message: "Error sending transaction", error: error.message };
  }
};

  

module.exports = { sendTransactionForRegister };