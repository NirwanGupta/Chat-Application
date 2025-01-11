const crypto = require('crypto');

const SYMMETRIC_KEY = Buffer.from(process.env.SYMMETRIC_KEY, 'hex');
const IV = Buffer.from(process.env.IV, 'hex');

const encryptPrivateKey = (privateKey) => {
    const cipher = crypto.createCipheriv('aes-256-cbc', SYMMETRIC_KEY, IV);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const decryptPrivateKey = (encryptedKey) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', SYMMETRIC_KEY, IV);
    let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

module.exports = { encryptPrivateKey, decryptPrivateKey };