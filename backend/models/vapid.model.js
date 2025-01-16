const mongoose = require(`mongoose`);

const vapidSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
}, {timestamps: true});

module.exports = mongoose.model('Vapid', vapidSchema);