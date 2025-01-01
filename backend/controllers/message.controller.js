const User = require(`../models/user.model`);
const Message = require(`../models/message.model`);
const {cloudinary} = require(`../db/cloudinary`);
const { getReceiverSocketId, io } = require("../db/socket");
const {client} = require(`../redis-client`);    

const getUsersForSidebar = async (req, res) => {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select(`-password`);
    res.status(200).json(filteredUsers);
}

const getMessages = async (req, res) => {
    const {id: receiverId} = req.params;
    const senderId = req.user._id;
    // console.log("senderId: ", senderId, ", receiverId: " , receiverId);
    console.log("Checking cache");
    const cacheMessages = await client.get(`Messages-${senderId}-${receiverId}`);
    if(cacheMessages) {
        console.log("Found in cache");
        const messages = JSON.parse(cacheMessages);
        return res.status(200).json(messages);
    }
    console.log("Not found in cache");
    const messages = await Message.find({
        $or: [
            {senderId: senderId, receiverId: receiverId},
            {senderId: receiverId, receiverId: senderId}
        ]
    });
    await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(messages));
    await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
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

    let messages = await client.get(`Messages-${senderId}-${receiverId}`);
    if(!messages) {
        await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify([newMessage]));
        await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
        return res.status(200).json(newMessage);
    }
    messages = JSON.parse(messages);
    messages.push(newMessage);
    await client.expire(`Messages-${senderId}-${receiverId}`, 0);
    await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(messages));
    res.status(200).json(newMessage);
}

const deleteMessage = async (req, res) => {
    const {id: messageId} = req.params;
    let message = await Message.findOne({_id: messageId});
    console.log(message.senderId, message.receiverId);
    const senderId = message.senderId;
    const receiverId = message.receiverId;
    message = await Message.findOneAndDelete({_id: messageId});
    let messages = await client.get(`Messages-${senderId}-${receiverId}`);
    messages = JSON.parse(messages);
    messages = messages.filter(mes => mes._id !== messageId);
    await client.expire(`Messages-${senderId}-${receiverId}`, 0);
    await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(messages));
    res.status(200).json(messages);
}

const editMessage = async(req, res) => {
    const {id: messageId} = req.params;
    const {text} = req.body;
    const message = await Message.findOne({_id: messageId});
    message.text = text;
    message.updatedAt = new Date();
    await message.save();
    const senderId = message.senderId;
    const receiverId = message.receiverId;
    let messages = await client.get(`Messages-${senderId}-${receiverId}`);
    messages = JSON.parse(messages);
    messages = messages.map(mes => mes._id === messageId ? message : mes);
    await client.expire(`Messages-${senderId}-${receiverId}`, 0);
    await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(messages));
    res.status(200).json(message);
}

module.exports = {
    getUsersForSidebar,
    getMessages,
    sendMessage,
    deleteMessage,
    editMessage,
};