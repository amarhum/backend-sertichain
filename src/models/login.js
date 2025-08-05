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

const checkTransactionForLogin = async (dataUser) => {
    try {
        
        const exists = await contract.verifyCertificate(dataUser);
        return exists;
    } catch (error) {
        console.error("Error checking transaction:", error);
        throw new Error("Blockchain verification failed.");
    }
}

module.exports = { checkTransactionForLogin };
