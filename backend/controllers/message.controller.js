const User = require(`../models/user.model`);
const Message = require(`../models/message.model`);
const {cloudinary} = require(`../db/cloudinary`);
const { getReceiverSocketId, io } = require("../db/socket");
const {client} = require(`../redis-client`);    
const { encryptMessage, decryptMessage } = require(`../db/encrypt`);
const {decryptPrivateKey} = require(`../db/encryptPrivateKey`);

const getUsersForSidebar = async (req, res) => {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select(`-password`);
    res.status(200).json(filteredUsers);
}

const getMessages = async (req, res) => {
    const {id: receiverId} = req.params;
    const senderId = req.user._id;

    const receiverUser = await User.findOne({_id: receiverId});
    const senderUser = await User.findOne({_id: senderId});

    let receiverClient = false;
    let cacheMessages = await client.get(`Messages-${senderId}-${receiverId}`);
    if(!cacheMessages) {
        cacheMessages = await client.get(`Messages-${receiverId}-${senderId}`);
        receiverClient = true;
    }
    if(cacheMessages) {
        let messages = JSON.parse(cacheMessages);
        messages.map((message) => {
            if(message.deleted) return message;
            let keyToUse;
            if((message.senderId.toString()) === (senderId.toString())) {
                keyToUse = receiverUser.privateKey;
            } 
            else {
                keyToUse = senderUser.privateKey;
            }
            const pvtKey = decryptPrivateKey(keyToUse);
            if(!pvtKey) {
                console.error("Private key decryption failed");
                return;
            }
            message.text = decryptMessage(message.text, pvtKey);
            if(message.image) {
                message.image = decryptMessage(message.image, pvtKey);
            }
        });
        return res.status(200).json(messages);
    }
    let messages = await Message.find({
        $or: [
            {senderId: senderId, receiverId: receiverId},
            {senderId: receiverId, receiverId: senderId}
        ]
    });

    console.log(messages);

    const tempMessages = await Message.find({
        $or: [
            {senderId: senderId, receiverId: receiverId},
            {senderId: receiverId, receiverId: senderId}
        ]
    });

    messages.map((message) => {
        let keyToUse;
        if(message.deleted) return message;
        if((message.senderId.toString()) === (senderId.toString())) {
            console.log("Using receiver's key");
            keyToUse = receiverUser.privateKey;
        } 
        else {
            console.log("Using sender's key");
            keyToUse = senderUser.privateKey;
        }
        const pvtKey = decryptPrivateKey(keyToUse);
        if(!pvtKey) {
            console.error("Private key decryption failed");
            return;
        }
        message.text = decryptMessage(message.text, pvtKey);
        console.log(message.text);
        if(message.image) {
            message.image = decryptMessage(message.image, pvtKey);
        }
    })

    console.log("messages: ", messages);
    console.log("tempMessages: ", tempMessages);
    if(receiverClient) {
        await client.set(`Messages-${receiverId}-${senderId}`, JSON.stringify(tempMessages));
        await client.expire(`Messages-${receiverId}-${senderId}`, 172800);
    }
    else {
        await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(tempMessages));
        await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
    }
    res.status(200).json(messages);
}

const sendMessage = async (req, res) => {
    const {text, image} = req.body;
    const {id: receiverId} = req.params;
    const senderId = req.user._id;

    const receiverUser = await User.findOne({_id: receiverId});
    if(!receiverUser) {
        return res.status(400).json({message: "Receiver not found"});
    }
    const publicKey = receiverUser.publicKey;

    let imageUrl = "";
    if(image) {
        const uploadResponse = await cloudinary.uploader.upload(image, {
            folder: 'CHAT-APPLICATION-message-pictures',
        });
        imageUrl = uploadResponse.secure_url;
    }
    const {encryptedText, encryptedImage} = encryptMessage(text, imageUrl, publicKey);
    const encryptedNewMessage = await Message.create({senderId, receiverId, text: encryptedText, image: encryptedImage});

    let newMessage = {
        _id: encryptedNewMessage._id,
        senderId: senderId,
        receiverId: receiverId,
        text: text,
        image: imageUrl,
        createdAt: encryptedNewMessage.createdAt,
        updatedAt: encryptedNewMessage.updatedAt,
        deleted: false,
    };

    const receiverSocketId = getReceiverSocketId(receiverId);
    if(receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    let messages = await client.get(`Messages-${senderId}-${receiverId}`);
    let receiverClient = false;
    if(!messages) {
        messages = await client.get(`Messages-${receiverId}-${senderId}`);
        receiverClient = true;
    }
    if(!messages) {
        await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify([encryptedNewMessage]));
        await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
        return res.status(200).json(newMessage);
    }
    messages = JSON.parse(messages);
    messages.push(encryptedNewMessage);
    if(receiverClient) {
        await client.expire(`Messages-${receiverId}-${senderId}`, 0);
        await client.set(`Messages-${receiverId}-${senderId}`, JSON.stringify(messages));
        await client.expire(`Messages-${receiverId}-${senderId}`, 172800);
    }
    else {
        await client.expire(`Messages-${senderId}-${receiverId}`, 0);
        await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(messages));
        await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
    }

    res.status(200).json(newMessage);
}

const deleteMessage = async (req, res) => {
    const {id: messageId} = req.params;
    let message = await Message.findOne({_id: messageId});
    let senderId = message.senderId;
    let receiverId = message.receiverId;
    message.text = 'This message was deleted';
    message.image = "";
    message.deleted = true;
    await message.save();

    const senderUser = await User.findOne({_id: senderId});
    const receiverUser = await User.findOne({_id: receiverId});

    let messages = await client.get(`Messages-${senderId}-${receiverId}`);
    let cacheMessages = await client.get(`Messages-${senderId}-${receiverId}`);
    let receiverClient = false;
    if(!cacheMessages) {
        messages = await client.get(`Messages-${receiverId}-${senderId}`);
        cacheMessages = await client.get(`Messages-${receiverId}-${senderId}`);
        receiverClient = true;
    }
    cacheMessages = JSON.parse(cacheMessages);
    messages = JSON.parse(messages);
    cacheMessages = cacheMessages.map((mes) => {
        if(mes._id === messageId) {
            return message;
        }
        return mes;
    });
    messages = messages.map((mes) => {
        if(mes._id === messageId) return message;
        return mes;
    });

    messages = messages.map((message) => {
        if(message.deleted) return message;
        let keyToUse;
        if((message.senderId.toString()) === (senderId.toString())) {
            keyToUse = receiverUser.privateKey;
        }
        else {
            keyToUse = senderUser.privateKey;
        }
        const pvtKey = decryptPrivateKey(keyToUse);
        if(!pvtKey) {
            console.error("Private key decryption failed");
            return;
        }
        message.text = decryptMessage(message.text, pvtKey);
        if(message.image) {
            message.image = decryptMessage(message.image, pvtKey);
        }
        return message;
    })

    const receiverSocketId = getReceiverSocketId(receiverId);
    if(receiverSocketId) {
        io.to(receiverSocketId).emit("deleteMessage", messages);
    }

    if(receiverClient) {
        await client.expire(`Messages-${receiverId}-${senderId}`, 0);
        await client.set(`Messages-${receiverId}-${senderId}`, JSON.stringify(cacheMessages));
        await client.expire(`Messages-${receiverId}-${senderId}`, 172800);
    }
    else {
        await client.expire(`Messages-${senderId}-${receiverId}`, 0);
        await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(cacheMessages));
        await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
    }
    res.status(200).json(messages);
}

const editMessage = async (req, res) => {
    const { id: messageId } = req.params;
    const { text } = req.body;

    let message = await Message.findOne({ _id: messageId });
    if(!message) {
        console.log("No message was found");
        return res.status(400).json({ message: "Message not found" });
    }

    const senderId = message.senderId;
    const receiverId = message.receiverId;

    const senderUser = await User.findOne({ _id: senderId });
    const receiverUser = await User.findOne({ _id: receiverId });

    message.text = encryptMessage(text, "", receiverUser.publicKey).encryptedText;
    message.updatedAt = new Date();
    await message.save();

    let cacheMessages = await client.get(`Messages-${senderId}-${receiverId}`);
    let messages = await client.get(`Messages-${senderId}-${receiverId}`);
    let receiverClient = false;

    if(!cacheMessages) {
        cacheMessages = await client.get(`Messages-${receiverId}-${senderId}`);
        messages = await client.get(`Messages-${receiverId}-${senderId}`);
        receiverClient = true;
    }

    cacheMessages = JSON.parse(cacheMessages);
    messages = JSON.parse(messages);

    cacheMessages = cacheMessages.map((mes) => {
        if(mes._id === messageId) {
            return { ...message.toObject() };
        }
        return mes;
    });

    messages = messages.map((mes) => {
        if(mes._id === messageId) {
            return { ...message.toObject() };
        }
        return mes;
    });

    messages = messages.map((msg) => {
        if (msg.deleted) return msg;
        let keyToUse = (msg.senderId.toString() === senderId.toString())? receiverUser.privateKey: senderUser.privateKey;
        const pvtKey = decryptPrivateKey(keyToUse);
        if(!pvtKey) {
            console.error("Private key decryption failed");
            return msg;
        }
        msg.text = decryptMessage(msg.text, pvtKey);
        if(msg.image) {
            msg.image = decryptMessage(msg.image, pvtKey);
        }
        return msg;
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if(receiverSocketId) {
        io.to(receiverSocketId).emit("editMessage", messages);
    }

    if(receiverClient) {
        await client.expire(`Messages-${receiverId}-${senderId}`, 0);
        await client.set(`Messages-${receiverId}-${senderId}`, JSON.stringify(cacheMessages));
        await client.expire(`Messages-${receiverId}-${senderId}`, 172800);
    } 
    else {
        await client.expire(`Messages-${senderId}-${receiverId}`, 0);
        await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(cacheMessages));
        await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
    }
    res.status(200).json(messages);
};


module.exports = {
    getUsersForSidebar,
    getMessages,
    sendMessage,
    deleteMessage,
    editMessage,
};