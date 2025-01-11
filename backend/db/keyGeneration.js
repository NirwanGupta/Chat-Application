const crypto = require('crypto');

const generateKeyPair = () => {
    return crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048, // 2048 bits ki key bnengi
        publicKeyEncoding: { type: 'spki', format: 'pem' }, // spki format me public key bnengi
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, // pkcs8 format me private key bnengi
    });
}
module.exports = { generateKeyPair };