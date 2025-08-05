// require("dotenv").config();
// const { ethers } = require("ethers");

// // ABI kontrak Anda
// const contractAbi = [
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

// const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
// const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
// const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractAbi, wallet);

// const sendTransaction = async (userData) => {
//   try {
//     const jsonData = JSON.stringify(userData);
//     const hashedData = ethers.keccak256(ethers.toUtf8Bytes(jsonData));
//     console.log("Data:", jsonData);
//     console.log("Hashed:", hashedData);

//     const exists = await contract.verifyCertificate(hashedData);

//     if (exists) {
//       console.log("Hash ditemukan di blockchain, mencari transaction hash...");

//       const eventTopic = ethers.id("CertificateStored(bytes32,address)");
//       const fromBlock = Number(process.env.CONTRACT_DEPLOY_BLOCK || 0);
//       const latestBlock = await provider.getBlockNumber();
//       const BATCH_SIZE = 100_000;

//       let currentFrom = fromBlock;
//       let foundLog = null;

//       while (currentFrom <= latestBlock) {
//         const currentTo = Math.min(currentFrom + BATCH_SIZE - 1, latestBlock);

//         try {
//           const logs = await provider.getLogs({
//             address: contract.target,
//             fromBlock: currentFrom,
//             toBlock: currentTo,
//             topics: [eventTopic, hashedData],
//           });

//           if (logs.length > 0) {
//             foundLog = logs[0];
//             break;
//           }
//         } catch (err) {
//           console.warn(`Gagal mencari log di blok ${currentFrom}-${currentTo}:`, err.message);
//         }

//         currentFrom += BATCH_SIZE;
//       }

//       if (foundLog) {
//         console.log("Log ditemukan:", foundLog.transactionHash);
//         return {
//           message: "Certificate already exists on the blockchain",
//           transactionHash: foundLog.transactionHash,
//           hashSertifikat: hashedData,
//           data : userData,
//         };
//       } else {
//         console.warn("Hash ditemukan tapi log transaksi tidak ditemukan.");
//         return {
//           message: "Certificate exists, but no transaction found.",
//           transactionHash: null,
//           hashSertifikat: hashedData,
//         };
//       }
//     }

//     // Jika belum ada, kirim transaksi
//     console.log("Sertifikat belum ada. Mengirim transaksi...");
//     const txResponse = await contract.storeCertificate(hashedData);
//     console.log("Tx sent:", txResponse.hash);

//     const txReceipt = await txResponse.wait();
//     console.log("Tx mined:", txReceipt.transactionHash);

//     return {
//       message: "Transaction sent successfully",
//       transactionHash: txReceipt.transactionHash,
//       hashSertifikat: hashedData,
//       receipt: txReceipt,
//       data : jsonData
//     };

//   } catch (error) {
//     console.error("Error:", error);
//     return {
//       message: "Error sending transaction",
//       error: error.message,
//     };
//   }
// };

// module.exports = { sendTransaction };




// // require("dotenv").config();
// // const walletConnection = require("../config/connection");
// // const { ethers } = require("ethers");
// // const sha256 = require("js-sha256");

// // const contractABI = [
// //   {
// //     "inputs": [{ "internalType": "bytes32", "name": "hashedData", "type": "bytes32" }],
// //     "name": "storeCertificate",
// //     "outputs": [],
// //     "stateMutability": "nonpayable",
// //     "type": "function"
// //   },
// //   {
// //     "inputs": [{ "internalType": "bytes32", "name": "hashedData", "type": "bytes32" }],
// //     "name": "verifyCertificate",
// //     "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
// //     "stateMutability": "view",
// //     "type": "function"
// //   }
// // ];

// // const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, walletConnection);

// // const findTransactionWithHash = async (hashedData) => {
// //   try {
// //     const exists = await contract.verifyCertificate(hashedData);
// //     if (exists) {
// //       console.log(`Hash ditemukan di blockchain: ${hashedData}`);
// //       return true;
// //     }
// //     console.log("Hash belum ditemukan di blockchain.");
// //     return false;
// //   } catch (error) {
// //     console.error("Error saat verifikasi hash:", error);
// //     return true;
// //   }
// // };

// // const sendTransaction = async (userData) => {
// //   try {
// //     const dataString = JSON.stringify(userData);
// //     console.log("Data to send:", dataString);

// //     let hash = sha256.create();
// //     hash.update(dataString);
// //     const hashedData = hash.hex(); 
// //     console.log("Hashed Data:", hashedData);

// //     const bytes32Hash = "0x" + hashedData;
// //     console.log("Formatted Bytes32 Hash:", bytes32Hash);

// //     const exists = await findTransactionWithHash(bytes32Hash);
// //     if (exists) {
// //       console.log("Certificate already exists on the blockchain. Transaction cancelled.");
// //       return { 
// //         message: "Certificate already exists on the blockchain",
// //        };
// //     }
    
// //     console.log("Mengirim transaksi ke smart contract...");
// //     const txResponse = await contract.storeCertificate(bytes32Hash);
// //     console.log("Transaction sent, waiting for confirmation:", txResponse.hash);

// //     const txReceipt = await txResponse.wait();
// //     console.log("Transaction mined:", txReceipt);

// //     return { 
// //       message: "Transaction sent successfully", 
// //       txHash: txResponse.hash, 
// //       receipt: txReceipt 
// //     };
// //   } catch (error) {
// //     console.error("Error saat mengirim transaksi:", error);
// //     return { message: "Error sending transaction", error: error.message };
// //   }
// // };

  
// // module.exports = { sendTransaction };

require("dotenv").config();
const { ethers } = require("ethers");
const crypto = require("crypto");

// ABI kontrak Anda
const contractAbi = [
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

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractAbi, wallet);

// Fungsi hashing SHA-256
function sha256ToBytes32(data) {
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  return "0x" + hash;
}

const sendTransaction = async (userData) => {
  try {
    const jsonData = JSON.stringify(userData);
    const hashedData = sha256ToBytes32(jsonData);
    console.log("Data:", jsonData);
    console.log("SHA-256 Hash:", hashedData);

    // Cek apakah hash sudah tercatat di blockchain
    const exists = await contract.verifyCertificate(hashedData);

    if (exists) {
      console.log("Hash ditemukan di blockchain, mencari transaction hash...");

      const eventTopic = ethers.id("CertificateStored(bytes32,address)");
      const fromBlock = Number(process.env.CONTRACT_DEPLOY_BLOCK || 0);
      const latestBlock = await provider.getBlockNumber();
      const BATCH_SIZE = 100_000;

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
          message: "Certificate already exists on the blockchain",
          transactionHash: foundLog.transactionHash,
          hashSertifikat: hashedData,
          data: userData,
        };
      } else {
        console.warn("Hash ditemukan tapi log transaksi tidak ditemukan.");
        return {
          message: "Certificate exists, but no transaction found.",
          transactionHash: null,
          hashSertifikat: hashedData,
        };
      }
    }

   
    console.log("Sertifikat belum ada. Mengirim transaksi...");
    const txResponse = await contract.storeCertificate(hashedData);
    console.log("Tx sent:", txResponse.hash);

    const txReceipt = await txResponse.wait();
    // console.log("Tx mined:", txReceipt.transactionHash);

    // if (txReceipt.status === 1) {
    //   console.log("Tx mined:", txReceipt.transactionHash);
    //   console.log("Sertifikat tercatat di blockchain!");
    // } else {
    //   console.error("Transaksi gagal ditambang.");
    // }

    return {
      message: "Transaction sent successfully",
      transactionHash: txReceipt.transactionHash,
      hashSertifikat: hashedData,
      receipt: txReceipt,
      data: userData,
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      message: "Error sending transaction",
      error: error.message,
    };
  }
};

module.exports = { sendTransaction };
