const { nonces } = require('../utils/nonces');
const checkLogin = (req,res)=>{

    const { address } = req.params;
    const nonce = Math.floor(Math.random() * 1000000).toString();
    nonces[address.toLowerCase()] = nonce;
    res.json({ nonce });
}

module.exports = { checkLogin };