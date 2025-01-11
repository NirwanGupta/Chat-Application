import CryptoJS from 'crypto-js';

export const storePrivateKey = (privateKey) => {
    const encryptedKey = CryptoJS.AES.encrypt(privateKey, import.meta.env.VITE_ENCRYPTION_KEY).toString();
    localStorage.setItem('privateKey', encryptedKey);
    console.log("Private key stored:", encryptedKey);
}

export const decryptedKey = () => {
    const encryptedKey = localStorage.getItem('privateKey');
    if(!encryptedKey) {
        console.error("No private key found in localStorage.");
        return null;
    }
    const bytes = CryptoJS.AES.decrypt(encryptedKey, import.meta.env.VITE_ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if(decrypted) {
        return decrypted;
    } 
    else {
        console.error("Decryption failed.");
        return null;
    }
}
