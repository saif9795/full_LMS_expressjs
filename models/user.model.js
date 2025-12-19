import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    userName:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: [ true, "Password is required" ],
    },
    role:{
        type: String,
        enum: ['student', 'instructor', 'admin'],
    },
    bio:{
        type: String,
    },
    avatarUrl:{
        type: String,
    },
    phoneNumber:{
        type: String,
    },
    socialLinks: 
        [
            { type: String }
        ],
    refreshToken:{
        type: String,
    }
},
    { timestamps: true}
)

userSchema.pre("save", async function(next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.ispasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = async function(password){
    return jwt.sign({
        _id: this._id,
        role: this.role,
        userName: this.userName,
        email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
)}

userSchema.methods.generateRefreshToken = async function(password){
    return jwt.sign({
        _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
)}

const User = mongoose.model('User', userSchema);

export default User;