const express = require('express');
const router = express.Router();
const {createVapid, getVapid} = require('../controllers/vapid.controller');
const {authenticateUser} = require("../middleware/auth.middleware");

router.post('/create', authenticateUser, createVapid);
router.get('/get', authenticateUser, getVapid);

module.exports = router;