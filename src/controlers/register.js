const sha256 = require("js-sha256")
const modelRegister = require("../models/register");

const register = async (req, res) => {
    const {email, password} = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    
    try {
        const dataUser = {
        email: email,
        password: password
        };

        const dataString = JSON.stringify(dataUser);
        console.log("Data to send:", dataString);
        
        let hash = sha256.create();
        hash.update(dataString);
        const hashedData = hash.hex(); 
        console.log("Hashed Data:", hashedData);

        const bytes32Hash = "0x" + hashedData;
        console.log("Formatted Bytes32 Hash:", bytes32Hash);
        
        const result = await modelRegister.sendTransactionForRegister(bytes32Hash);
        if (result.message === "User already exists") {
            return res.status(400).json({ error: "User sudah terdaftar" });
        }
        return res.status(200).json({
            message: result.message || "Registration successful",
            txHash: result.txHash || null
        });
         
        } catch (error) {
        console.error("Error during registration:", error);
        return res.status(500).json({ error: "Failed to register user" });
        }
}

module.exports = {register};