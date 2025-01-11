const crypto = require('crypto');

const encryptMessage = (message, image, publicKey) => {
    const bufferMessage = Buffer.from(message, 'utf8');
    if(image === "") {
        let encryptedText = crypto.publicEncrypt(publicKey, bufferMessage);
        encryptedText = encryptedText.toString('base64');
        return {encryptedText, encryptedImage: ""};
    }
    let encryptedText = crypto.publicEncrypt(publicKey, bufferMessage);
    encryptedText = encryptedText.toString('base64');
    const bufferImage = Buffer.from(image, 'utf8');
    let encryptedImage = crypto.publicEncrypt(publicKey, bufferImage);
    encryptedImage = encryptedImage.toString('base64');
    return {encryptedText, encryptedImage};
}

const decryptMessage = (encryptedMessage, privateKey) => {
    const bufferEncryptedMessage = Buffer.from(encryptedMessage, 'base64');
    const decryptedMessage = crypto.privateDecrypt(privateKey, bufferEncryptedMessage);
    return decryptedMessage.toString('utf8');
}

module.exports = { encryptMessage, decryptMessage };