const CryptoJS = require('crypto-js');

const encryptMessage = (message, image, publicKey) => {
    console.log("private key: ", process.env.PRIVATE_KEY);
    const encryptedText = CryptoJS.AES.encrypt(message, publicKey).toString();
    if(image === "") return {encryptedText, encryptedImage: ""};
    const encryptedImage = CryptoJS.AES.encrypt(image, publicKey).toString();
    return {encrypted, encryptedImage};
}

const decryptMessage = (encryptedText, privateKey) => {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedText, privateKey);
    console.log("decrypted message: ", decryptedBytes.toString(CryptoJS.enc.Utf8))
    return decryptedBytes.toString(CryptoJS.enc.Utf8);
};

module.exports = { encryptMessage, decryptMessage };