const express = require(`express`);
const { authenticateUser } = require("../middleware/auth.middleware");
const router = express.Router();
const {getUsersForSidebar, getMessages, sendMessage} = require(`../controllers/message.controller`);

router.route(`/users`).get(authenticateUser, getUsersForSidebar);
router.route(`/:id`).get(authenticateUser, getMessages);
router.route(`/send/:id`).post(authenticateUser, sendMessage);

module.exports = router;