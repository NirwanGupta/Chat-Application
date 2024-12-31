const mongoose = require('mongoose');
const bcrypt = require(`bcryptjs`);

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    profilePic: {
        type: String,
        default: `https://res.cloudinary.com/drnrsxnx9/image/upload/v1713185399/Music-World/Profile-Images/default-avatar-profile-icon-vector-social-media-user-image-182145777_mqovgx.webp`
    },
}, {timestamps: true});

userSchema.pre(`save`, async function() {
    if(!this.isModified(`password`))    return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
};

module.exports = mongoose.model(`User`, userSchema);