const Vapid = require("../models/vapid.model");

const createVapid = async (req, res) => {
    const { vapidKey } = req.body;
    if(!vapidKey) {
        return res.status(400).json({ error: "Vapid key is required" });
    }
    console.log(req.user);
    const vapid = await Vapid.create({ user: req.user._id, token: vapidKey });
    return res.status(201).json({ vapid });
};

const getVapid = async (req, res) => {
    const vapid = await Vapid.findOne({ user: req.user._id });
    return res.status(200).json({ vapid });
}

module.exports = { createVapid, getVapid };