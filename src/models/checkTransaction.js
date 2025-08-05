// require("dotenv").config();
// const { ethers } = require("ethers");
// const walletConnection = require("../config/connection");

// // Provider dan kontrak
// const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
// const contractABI = [
//   {
//     "inputs": [{ "internalType": "bytes32", "name": "hashedData", "type": "bytes32" }],
//     "name": "storeCertificate",
//     "outputs": [],
//     "stateMutability": "nonpayable",
//     "type": "function"
//   },
//   {
//     "inputs": [{ "internalType": "bytes32", "name": "hashedData", "type": "bytes32" }],
//     "name": "verifyCertificate",
//     "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
//     "stateMutability": "view",
//     "type": "function"
//   },
//   {
//     "anonymous": false,
//     "inputs": [
//       { "indexed": true, "internalType": "bytes32", "name": "hashedData", "type": "bytes32" },
//       { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }
//     ],
//     "name": "CertificateStored",
//     "type": "event"
//   }
// ];

// const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, walletConnection);

// const checkTransaction = async (dataSertifikat) => {
//   try {
//     const jsonData = JSON.stringify(dataSertifikat);
//     console.log("Data:", jsonData);

//     const hashedData = ethers.keccak256(ethers.toUtf8Bytes(jsonData));
//     console.log("Hashed:", hashedData);

//     const exists = await contract.verifyCertificate(hashedData);
//     if (!exists) {
//       return {
//         message: "Certificate not found on the blockchain.",
//         exists: false,
//         hashSertifikat: hashedData
//       };
//     }

//     console.log("Hash ditemukan di blockchain, mencari transaction hash...");
//     const eventTopic = ethers.id("CertificateStored(bytes32,address)");
//     const fromBlock = Number(process.env.CONTRACT_DEPLOY_BLOCK || 0);
//     const latestBlock = await provider.getBlockNumber();
//     const BATCH_SIZE = 100000;

//     let currentFrom = fromBlock;
//     let foundLog = null;

//     while (currentFrom <= latestBlock) {
//       const currentTo = Math.min(currentFrom + BATCH_SIZE - 1, latestBlock);

//       try {
//         const logs = await provider.getLogs({
//           address: contract.target,
//           fromBlock: currentFrom,
//           toBlock: currentTo,
//           topics: [eventTopic, hashedData],
//         });

//         if (logs.length > 0) {
//           foundLog = logs[0];
//           break;
//         }
//       } catch (err) {
//         console.warn(`Gagal mencari log di blok ${currentFrom}-${currentTo}:`, err.message);
//       }

//       currentFrom += BATCH_SIZE;
//     }

//     if (foundLog) {
//       console.log("Log ditemukan:", foundLog.transactionHash);
//       return {
//         message: "Certificate found on blockchain",
//         transactionHash: foundLog.transactionHash,
//         hashSertifikat: hashedData,
//         exists: true
//       };
//     } else {
//       console.warn("Hash ditemukan tapi log transaksi tidak ditemukan.");
//       return {
//         message: "Certificate exists, but no transaction found.",
//         transactionHash: null,
//         hashSertifikat: hashedData,
//         exists: true
//       };
//     }

//   } catch (error) {
//     console.error("Error checking transaction:", error);
//     throw new Error("Blockchain verification failed.");
//   }
// };

// module.exports = { checkTransaction };

require("dotenv").config();
const { ethers } = require("ethers");
const crypto = require("crypto"); // Tambahkan ini
const walletConnection = require("../config/connection");

// Provider dan kontrak
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
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
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "hashedData", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }
    ],
    "name": "CertificateStored",
    "type": "event"
  }
];

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, walletConnection);

// Fungsi hashing SHA-256 yang mengembalikan bytes32 dalam format heksadesimal seperti keccak256
function sha256ToBytes32(data) {
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  return "0x" + hash;
}

const checkTransaction = async (dataSertifikat) => {
  try {
    const jsonData = JSON.stringify(dataSertifikat);
    console.log("Data:", jsonData);

    const hashedData = sha256ToBytes32(jsonData);
    console.log("Hashed:", hashedData);

    const exists = await contract.verifyCertificate(hashedData);
    if (!exists) {
      return {
        message: "Certificate not found on the blockchain.",
        exists: false,
        hashSertifikat: hashedData
      };
    }

    console.log("Hash ditemukan di blockchain, mencari transaction hash...");
    const eventTopic = ethers.id("CertificateStored(bytes32,address)");
    const fromBlock = Number(process.env.CONTRACT_DEPLOY_BLOCK || 0);
    const latestBlock = await provider.getBlockNumber();
    const BATCH_SIZE = 100000;

    let currentFrom = fromBlock;
    let foundLog = null;

    while (currentFrom <= latestBlock) {
      const currentTo = Math.min(currentFrom + BATCH_SIZE - 1, latestBlock);

      try {
        const logs = await provider.getLogs({
          address: contract.target,
          fromBlock: currentFrom,
          toBlock: currentTo,
          topics: [eventTopic, hashedData],
        });

        if (logs.length > 0) {
          foundLog = logs[0];
          break;
        }
      } catch (err) {
        console.warn(`Gagal mencari log di blok ${currentFrom}-${currentTo}:`, err.message);
      }

      currentFrom += BATCH_SIZE;
    }

    if (foundLog) {
      console.log("Log ditemukan:", foundLog.transactionHash);
      return {
        message: "Certificate found on blockchain",
        transactionHash: foundLog.transactionHash,
        hashSertifikat: hashedData,
        exists: true
      };
    } else {
      console.warn("Hash ditemukan tapi log transaksi tidak ditemukan.");
      return {
        message: "Certificate exists, but no transaction found.",
        transactionHash: null,
        hashSertifikat: hashedData,
        exists: true
      };
    }

  } catch (error) {
    console.error("Error checking transaction:", error);
    throw new Error("Blockchain verification failed.");
  }
};

module.exports = { checkTransaction };