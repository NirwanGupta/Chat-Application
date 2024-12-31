const User = require(`../models/user.model`);
const Message = require(`../models/message.model`);
const {cloudinary} = require(`../db/cloudinary`);
const { getReceiverSocketId, io } = require("../db/socket");

const getUsersForSidebar = async (req, res) => {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select(`-password`);
    res.status(200).json(filteredUsers);
}

const getMessages = async (req, res) => {
    const {id: receiverId} = req.params;
    const senderId = req.user._id;
    // console.log("senderId: ", senderId, ", receiverId: " , receiverId);
    const messages = await Message.find({
        $or: [
            {senderId: senderId, receiverId: receiverId},
            {senderId: receiverId, receiverId: senderId}
        ]
    });
    res.status(200).json(messages);
}

const sendMessage = async (req, res) => {
    const {text, image} = req.body;
    const {id: receiverId} = req.params;
    const senderId = req.user._id;
    let imageUrl;
    if(image) {
        const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: 'CHAT-APPLICATION-message-pictures',
        });
        imageUrl = uploadResponse.secure_url;
    }
    const newMessage = await Message.create({senderId, receiverId, text, image: imageUrl});

    const receiverSocketId = getReceiverSocketId(receiverId);
    if(receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
        // console.log("newMessage: ", newMessage);
    }

    res.status(200).json(newMessage);
}

module.exports = {
    getUsersForSidebar,
    getMessages,
    sendMessage,
};