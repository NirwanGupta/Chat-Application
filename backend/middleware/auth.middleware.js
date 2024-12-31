const jwt = require(`jsonwebtoken`);
const User = require(`../models/user.model`);

const authenticateUser = async (req, res, next) => {
    const token = req.cookies.jwt;
    if(!token) {
        return res.status(401).json({message: "Unauthorized - No token Provided"});
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if(!decoded) {
        return res.status(401).json({message: "Unauthorized - Invalid token"});
    }    
    const user = await User.findById(decoded.userId).select(`-password`);
    if(!user) {
        return res.status(404).json({message: "User not found"});
    }
    req.user = user;
    next();
};

module.exports = {authenticateUser};