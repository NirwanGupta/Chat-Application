const User = require('../models/user.model');
const {generateToken} = require('../db/utils');
const {cloudinary} = require('../db/cloudinary');
const {generateKeyPair} = require('../db/keyGeneration'); 
const CryptoJS = require('crypto-js');
const {encryptMessage, decryptMessage} = require('../db/encrypt');

const signup = async (req, res) => {
    console.log("SignUP");
    const {email, fullName, password} = req.body;
    if(!email || !fullName || !password) {
        res.status(400).json({message: "Please fill in the required fields"});
    }
    const {publicKey, privateKey} = generateKeyPair();
    // const privateKeyEnc = CryptoJS.AES.encrypt(privateKey, process.env.ENCRYPTION_KEY).toString();
    const privateKeyEnc = privateKey;
    const newUser = await User.create({email, fullName, password, publicKey, privateKey: privateKeyEnc});
    generateToken(newUser._id, res);
    await newUser.save();

    res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profile,
        privateKey: privateKey,
    });
};

const login = async (req, res) => {
    const {email, password} = req.body;
    if(!email || !password) {
        res.status(400).json({message: "Please fill in the required fields"});
    }
    const user = await User.findOne({email});
//     const publicKey = `-----BEGIN PUBLIC KEY-----
// MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwFN39q5vew13N38+e+er
// +KisjV5LHRcgjMUS8MJoYGxHReGYgnLc0j/SGwzb0QUUNZB+Yk4d5CY4nUhms9Ts
// gAf/TEjNJTRM6k+rRyK5LfW6INzArPauSKR3LTF7yFMGpiGmMihUeP6CAXjRhRdX
// KizdfQ3y+S2Qbnse/fGUceIUAqFuhnQe8ONHpIjAGxkYl4QrsKtcSMwBCx4oAPSl
// nBqWRK1J3vl/WP7lWv6/bqU31vfbU4/GQpETdYrdZZ/uAipn/WQLJtdg48+rfbeZ
// cswTBHgc3/8NIodVGdiJ7NXt27+d9V8r2KsMVILxH0JtF0SrhztBy+3KXZktxt37
// XQIDAQAB
// -----END PUBLIC KEY-----`;

// const privateKey = `-----BEGIN PRIVATE KEY-----
// MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDAU3f2rm97DXc3
// fz5756v4qKyNXksdFyCMxRLwwmhgbEdF4ZiCctzSP9IbDNvRBRQ1kH5iTh3kJjid
// SGaz1OyAB/9MSM0lNEzqT6tHIrkt9bog3MCs9q5IpHctMXvIUwamIaYyKFR4/oIB
// eNGFF1cqLN19DfL5LZBuex798ZRx4hQCoW6GdB7w40ekiMAbGRiXhCuwq1xIzAEL
// HigA9KWcGpZErUne+X9Y/uVa/r9upTfW99tTj8ZCkRN1it1ln+4CKmf9ZAsm12Dj
// z6t9t5lyzBMEeBzf/w0ih1UZ2Ins1e3bv531XyvYqwxUgvEfQm0XRKuHO0HL7cpd
// mS3G3ftdAgMBAAECggEAAtTHuY8oT3ariFrca90FdE/hWGRotSkrvr7A8F/gQvkd
// FHuFb/gqZYLwgBrwmnNZcI9ruN0/BeaFI1WXQ3LxN1JG0RPqRy+tqS5ajl3FvZY2
// Mvkk8fbgqmuXYIgvswt719K7fFYJJk3S0pw5c1zcWN/Xs9lSeBYSX/n6gxD9Fy8P
// BCwPIecXoopu4NuOG6bdfA4z81xbK2F7Ivt3zcMi2AcSeqgmsnb+HCbtKyu59GHZ
// qnEIkd1t+LnuTfgTjDZvUIm9PnKPpcN2d9cDjbrMKXhiSHYRpDr5/PUswD7SiuFg
// HwqOLe9INJRemcITgVBBNjdNamsrDax3wRC9TGiDcQKBgQDmsJiL4glXF7s/Ns+K
// VfaAg4ndR2AY9hAbOd+AfWO8xoCMiJamwfBlbebs6QnpN1gNjARPaAYqOgBTFmjh
// MBWeusyPKJk2auAD+RjL4Z9itcrWFvfOOJpT1plw08ARj7/VGh/pgAePHG7WbRnC
// GEmcVbn8/d3g9fyM3VZG4d59rQKBgQDVbVicEXvzy5rz2lZO/Xasy/NnzVE5tSPp
// aMzf1yseQnxAEks3SF7bY57zT6/xt7fTHO0K2jkvMnNr8whfxdS78sVTkvhQXohR
// OjFLzzb1Dvyo5sYiZKAr4WmwrwYEnZbK9qXQ2pW783mokbiWWG7TJucwXlruYKZ+
// 998ISjbKcQKBgFA2r5RUMHM8KTu9z0SGx4PAOTvcCaokRU1yPijrcLa/PwueouOx
// I+ng4R8XmP6i49cyDH2f6iTcrig17pn+okXjJiXRNBUb7HD1OI4MEeO82p6+tcPb
// Iq5sPEZjGrIAje+HefkzL22vsUqV/RLkZxQZKuaxT2ldn0dL3ygeecKxAoGANXd5
// NU/j/4VIQkK2UH+K1WsahSyYZp6MapLIkGL0+FWrjtmGYkkNCmUAku+poiJmOMsM
// TyWwIbS/2ZE+zc9fpd4BtRgigO/NspujcdxtZiLlBOMbS85tmdCUi6CtH0bjWeFE
// VPgNftJV7fbjiTaKPPeH/0QD/6fSzggGpasB4uECgYEA1Z6oPEir7it4agfcPVRr
// yTBl2F2eFGXX5o1W+GeTy3oZppR8wXuawTSm53S4pg0mAVQmgiQEDF80LeAS2aVF
// eY2+tz0SG+L9yPrRYSAlgklOoJ+k90g79wdnVijanMn+5GmgO2PNLgxvFgO6wExf
// +yU/pi3vaBSzCuFvhdnnwWQ=
// -----END PRIVATE KEY-----`;

// const encryptedMessage = encryptMessage('Hello, World!', publicKey);
// console.log(encryptedMessage);  // Should print base64-encoded encrypted message

// const decryptedMessage = decryptMessage(encryptedMessage, privateKey);  
// console.log(decryptedMessage);  // Should print 'Hello, World!'

    if(!user) {
        res.status(400).json({message: "User does not exist please sign up"});
    }
    const isMatch = await user.comparePassword(password);
    if(!isMatch) {
        res.status(400).json({message: "Invalid credentials"});
    }
    generateToken(user._id, res);
    res.status(200).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
    });
};

const logout = async (req, res) => {
    res.cookie("jwt", "", {maxAge: 0});
    res.status(200).json({message: "Logged out successfully"});
};

const updateProfile = async (req, res) => {
    const {profilePic} = req.body;
    const userId = req.user._id;
    if(!profilePic) {
        return res.status(400).json({message: "Please provide a profile picture"});
    }
    const uploadResponse = await cloudinary.uploader.upload(profilePic, {
        folder: 'CHAT-APPLICATION-profile_pictures',
    });
    const user = await User.findById({_id: userId});
    user.profilePic = uploadResponse.secure_url;
    await user.save();
    return res.status(200).json(user);
}

const checkAuth = async (req, res) => {
    res.status(200).json(req.user);
}

const getUsers = async (req, res) => {
    const {search} = req.query;
    if(search) {
        const users = await User.find({fullName: {$regex: search, $options: "i"}});
        if(!users) {
            return res.status(404).json({message: "No users found"});
        }
        return res.status(200).json(users);
    }
    return res.status(400).json({message: "Please provide a search query"});
}

module.exports = {
    signup,
    login,
    logout, 
    updateProfile, 
    checkAuth,
    getUsers,
};