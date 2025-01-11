const User = require(`../models/user.model`);
const Message = require(`../models/message.model`);
const {cloudinary} = require(`../db/cloudinary`);
const { getReceiverSocketId, io } = require("../db/socket");
const {client} = require(`../redis-client`);    
const { encryptMessage, decryptMessage } = require(`../db/encrypt`);
const CryptoJS = require('crypto-js');

//  cache key -> message - jisne message bheja - jisko bheja

const getUsersForSidebar = async (req, res) => {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select(`-password`);
    res.status(200).json(filteredUsers);
}

// const getMessages = async (req, res) => {
//     const {id: receiverId} = req.params;
//     const senderId = req.user._id;

//     let receiverClient = false;
//     console.log("Checking cache");
//     let cacheMessages = await client.get(`Messages-${senderId}-${receiverId}`);
//     if(!cacheMessages) {
//         cacheMessages = await client.get(`Messages-${receiverId}-${senderId}`);
//         receiverClient = true;
//     }
//     // if(cacheMessages) {
//     //     const messages = JSON.parse(cacheMessages);

//     //     return res.status(200).json(messages);
//     // }
//     console.log("Not found in cache");
//     const messages = await Message.find({
//         $or: [
//             {senderId: senderId, receiverId: receiverId},
//             {senderId: receiverId, receiverId: senderId}
//         ]
//     });

//     const receiverUser = await User.findOne({_id: receiverId});
//     const senderUser = await User.findOne({_id: senderId});

//     messages.map((message) => {
//         const keyToUse = message.senderId !== senderId ? senderUser.privateKey : receiverUser.privateKey;
//         console.log(keyToUse);
//         const pvtKey = CryptoJS.AES.decrypt(keyToUse, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
//         message.text = decryptMessage(message.text, pvtKey);
//         if(message.image) {
//             message.image = decryptMessage(message.image, pvtKey);
//         }
//     })
//     if(receiverClient) {
//         await client.set(`Messages-${receiverId}-${senderId}`, JSON.stringify(messages));
//         await client.expire(`Messages-${receiverId}-${senderId}`, 172800);
//     }
//     else {
//         await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(messages));
//         await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
//     }
//     res.status(200).json(messages);
// }

const getMessages = async (req, res) => {
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let receiverClient = false;
    console.log("Checking cache");

    let cacheMessages = await client.get(`Messages-${senderId}-${receiverId}`);
    if (!cacheMessages) {
        cacheMessages = await client.get(`Messages-${receiverId}-${senderId}`);
        receiverClient = true;
    }

    console.log("Not found in cache");

    const messages = await Message.find({
        $or: [
            { senderId: senderId, receiverId: receiverId },
            { senderId: receiverId, receiverId: senderId }
        ]
    });

    const receiverUser = await User.findOne({ _id: receiverId });
    const senderUser = await User.findOne({ _id: senderId });

    messages.map((message) => {
        const keyToUse = message.senderId !== senderId ? receiverUser.privateKey : senderUser.privateKey;
        
        // Debugging: Log the selected private key
        console.log("Selected key for decryption:", keyToUse);

        if (!keyToUse) {
            console.error("Private key is missing for decryption");
            return; // Skip this message if no key is available
        }

        const pvtKey = CryptoJS.AES.decrypt(keyToUse, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);

        // Debugging: Log the decrypted private key
        console.log("Decrypted private key:", pvtKey);

        if (!pvtKey) {
            console.error("Private key decryption failed");
            return; // Skip this message if decryption fails
        }

        try {
            message.text = decryptMessage(message.text, pvtKey);
            if (message.image) {
                message.image = decryptMessage(message.image, pvtKey);
            }
        } catch (error) {
            console.error("Decryption failed for message:", message, error);
        }
    });

    if (receiverClient) {
        await client.set(`Messages-${receiverId}-${senderId}`, JSON.stringify(messages));
        await client.expire(`Messages-${receiverId}-${senderId}`, 172800);
    } else {
        await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify(messages));
        await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
    }

    res.status(200).json(messages);
};


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

    const newMessage = await Message.create({senderId, receiverId, text, image: imageUrl});
    const messageId = newMessage._id;

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
        await client.set(`Messages-${senderId}-${receiverId}`, JSON.stringify([newMessage]));
        await client.expire(`Messages-${senderId}-${receiverId}`, 172800);
        return res.status(200).json(newMessage);
    }
    messages = JSON.parse(messages);
    messages.push(newMessage);
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

    await Message.findOneAndDelete({_id: messageId});
    res.status(200).json(newMessage);
}

const deleteMessage = async (req, res) => {
    const {id: messageId} = req.params;
    let message = await Message.findOne({_id: messageId});
    
    const senderId = message.senderId;
    const receiverId = message.receiverId;
    message.text = 'This message was deleted';
    message.image = "";
    message.deleted = true;
    await message.save();

    let cacheMessages = await client.get(`Messages-${senderId}-${receiverId}`);
    let receiverClient = false;
    if(!cacheMessages) {
        cacheMessages = await client.get(`Messages-${receiverId}-${senderId}`);
        receiverClient = true;
    }
    cacheMessages = JSON.parse(cacheMessages);
    cacheMessages = cacheMessages.map((mes) => {
        if(mes._id === messageId) {
            return message;
        }
        return mes;
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if(receiverSocketId) {
        io.to(receiverSocketId).emit("deleteMessage", cacheMessages);
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
    res.status(200).json(cacheMessages);
}

const editMessage = async(req, res) => {
    const {id: messageId} = req.params;
    console.log("messageId: " , messageId);
    const {text} = req.body;
    console.log("text: ", text);
    let message = await Message.findOne({_id: messageId});
    if(!message) {
        console.log("No message was found");
        return res.status(400).json({message: "Message not found"});    
    }
    message.text = text;
    message.updatedAt = new Date();
    await message.save();
    const senderId = message.senderId;
    const receiverId = message.receiverId;

    let cacheMessages = await client.get(`Messages-${senderId}-${receiverId}`);
    let receiverClient = false;
    if(!cacheMessages) {
        cacheMessages = await client.get(`Messages-${receiverId}-${senderId}`);
        receiverClient = true;
    }

    cacheMessages = JSON.parse(cacheMessages);
    cacheMessages = cacheMessages.map((mes) => {
        if(mes._id === messageId) {
            return message;
        }
        return mes;
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if(receiverSocketId) {
        io.to(receiverSocketId).emit("editMessage", cacheMessages);
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
    
    res.status(200).json(cacheMessages);
}

module.exports = {
    getUsersForSidebar,
    getMessages,
    sendMessage,
    deleteMessage,
    editMessage,
};