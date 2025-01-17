const User = require('../models/user.model');
const {generateToken} = require('../db/utils');
const {cloudinary} = require('../db/cloudinary');
const {generateKeyPair} = require('../db/keyGeneration'); 
const CryptoJS = require('crypto-js');
const {encryptPrivateKey} = require('../db/encryptPrivateKey');

const signup = async (req, res) => {
    console.log("SignUP");
    const {email, fullName, password} = req.body;
    if(!email || !fullName || !password) {
        res.status(400).json({message: "Please fill in the required fields"});
    }
    const {publicKey, privateKey} = generateKeyPair();

    const privateKeyEnc = encryptPrivateKey(privateKey);
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