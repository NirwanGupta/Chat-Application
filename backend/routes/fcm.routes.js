const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/fcm.controller');
const {authenticateUser} = require(`../middleware/auth.middleware`);

router.post('/send-notification', authenticateUser, sendMessage);

module.exports = router;
