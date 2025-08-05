const { verifyMessage } = require("ethers");

function verifySignature(message, signature) {
    return verifyMessage(message, signature);
}

module.exports = { verifySignature };
