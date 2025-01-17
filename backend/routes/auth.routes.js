const express = require(`express`);
const router = express.Router();

const {authenticateUser} = require(`../middleware/auth.middleware`);
const { signup, login, logout, updateProfile, checkAuth, getUsers } = require(`../controllers/auth.controller`);

router.route(`/signup`).post(signup);
router.route(`/login`).post(login);
router.route(`/logout`).get(logout);
router.route(`/update-profile`).patch(authenticateUser, updateProfile);
router.route(`/check`).get(authenticateUser, checkAuth);
router.route(`/users`).get(authenticateUser, getUsers);

module.exports = router;