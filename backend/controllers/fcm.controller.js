const admin = require('../db/firebase-admin');
const Vapid = require(`../models/vapid.model`);

const sendMessage = async (req, res) => {
    const {text, sender} = req.body;
    const vapid = await Vapid.findOne({user: req.user._id});
    const registrationToken = vapid.token;
    if(!registrationToken) {
        return res.status(400).json({ error: 'Registration token is required' });
    }

    const message = {
        notification: {
            title: 'New Message',
            body: `${sender}: ${text}`,
        },
        token: registrationToken,
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return res.status(200).json({ success: true, message: response });
    } catch (error) {
        console.log('Error sending message:', error);
        return res.status(500).json({ error: 'Failed to send message' });
    }
};

module.exports = { sendMessage };
