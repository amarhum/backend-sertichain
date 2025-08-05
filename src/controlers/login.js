const { verifySignature } = require('../models/verifySignature');
const { nonces } = require('../utils/nonces');

const login = async (req, res) => {

   const allowedAdmins = process.env.ADDRESS_ALLOWED 
    ? process.env.ADDRESS_ALLOWED.split(',').map(addr => addr.toLowerCase())
    : [];

    const { address, signature } = req.body;
    const lowerAddress = address.toLowerCase();
    const nonce = nonces[lowerAddress];

    if (!nonce) {
        return res.status(400).json({ error: "No nonce found for this address." });
    }

    try {
        const signerAddress = verifySignature(nonce, signature);

        if (signerAddress.toLowerCase() !== lowerAddress) {
            return res.status(401).json({ error: "Signature verification failed." });
        }

        if (!allowedAdmins.includes(lowerAddress)) {
            return res.status(403).json({ error: "Alamat dompet tidak terdaftar sebagai admin" });
        }

        delete nonces[lowerAddress];
        res.json({ success: true, message: "Login successful." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error." });
    }
}

module.exports = {login};

// const sha256 = require("js-sha256")
// const modelLogin = require("../models/login");

//   const {email, password} = req.body;
  //   if (!email || !password) {
  //       return res.status(400).json({ error: "Email and password are required" });
  //   }
    
  //   try {
  //       const dataUser = {
  //       email: email,
  //       password: password
  //       };

  //       const dataString = JSON.stringify(dataUser);
  //       console.log("Data to send:", dataString);
        
  //       let hash = sha256.create();
  //       hash.update(dataString);
  //       const hashedData = hash.hex(); 
  //       console.log("Hashed Data:", hashedData);

  //       const bytes32Hash = "0x" + hashedData;
  //       console.log("Formatted Bytes32 Hash:", bytes32Hash);
        
  //       const isValid = await modelLogin.checkTransactionForLogin(bytes32Hash);
  //       return res.status(200).json({
  //         success: isValid,
  //         message: isValid
  //           ? "User VALID: Hash ditemukan di blockchain."
  //           : "User INVALID: Hash tidak ditemukan di blockchain.",
  //         isValid,
  //         dataUser,
  //       });
  // } catch (error) {
  //   console.error("Error saat memproses sertifikat:", error);
  //   return res.status(500).json({ error: "Gagal memproses sertifikat" });
  // }