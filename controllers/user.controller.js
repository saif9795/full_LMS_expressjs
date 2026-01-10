import User from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import jwt from 'jsonwebtoken';
import { transporter } from "../utils/nodemailer.js";
import crypto from "crypto";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
            return res.status(500).json({
            success: false,
            message: "Somethign went wrong while generating tokens",
        });
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const {userName, email, password, role, bio, phoneNumber} = req.body;
    let { socialLinks } = req.body;

    if(!userName || !email || !password){
        return res.status(400).json(
            new ApiResponse(400, null, "Please provide all required fields: userName, email, password")
        )
    }

    const existingUser = await User.findOne({email});

    if(existingUser){
        return res.status(409).json(
            new ApiResponse(409, null, "User with this email already exists")
        )
    }

    if(role && !['student', 'instructor', 'admin'].includes(role)){
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid role specified")
        )
    }

      if (typeof socialLinks === "string") {
    socialLinks = [socialLinks];
  }
  if (!Array.isArray(socialLinks)) {
    socialLinks = [];
  }

    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        return res.status(400).json(
            new ApiResponse(400, null, "Avatar image is required")
        )
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar){
        return res.status(500).json(
            new ApiResponse(500, null, "Failed to upload avatar image")
        )
    }

    const user = await User.create({
        userName, 
        email, 
        password, 
        role, 
        bio, 
        phoneNumber, 
        socialLinks,
        avatarUrl: avatar.secure_url,

    })

    const createUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createUser){
        return res.status(500).json(
            new ApiResponse(500, null, "Failed to create user")
        )
    }

    return res.status(201).json( 
        new ApiResponse(201, createUser, "User registered successfully")
    )
});

const loginUser = asyncHandler(async (req, res) => {
    const {email, password} = req.body;

    if(!email || !password){
        return res.status(400).json(
            new ApiResponse(400, null, "Please provide both email and password")
        )
    }

    const user = await User.findOne({email});

    if(!user){
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        )
    }

    const isPasswordValid = await user.ispasswordCorrect(password);

    if(!isPasswordValid){
        return res.status(401).json(
            new ApiResponse(401, null, "Invalid password")
        )
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            data: loggedInUser, 
            accessToken: accessToken, 
            refreshToken: refreshToken}, 
            "User logged in successfully")
    );

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },{
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, null, "User logged out successfully")
    );
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        return res.status(401).json(
            new ApiResponse(401, null, "Unauthorized request")
        )
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id);

    if(!user){
        return res.status(404).json(
            new ApiResponse(404, null, "Invalid refresh token")
        )
    }

    if(user?.refreshToken !== incomingRefreshToken){
        return res.status(401).json(
            new ApiResponse(401, null, "Refresh token is expired")
        )
    }

    const options = {
        httpOnly: true,
        secure: true,
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            accessToken: accessToken, 
            refreshToken: refreshToken}, 
            "Access token refreshed successfully")
    );
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await user.ispasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        return res.status(401).json(
            new ApiResponse(401, null, "Old password is incorrect")
        )
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, null, "Password changed successfully")
    );
})

const getCurrentUser = asyncHandler(async (req, res) => {

    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    );
})

const sendForgetPasswordOTP = asyncHandler(async (req, res) => {
    const {email} = req.body;

    if(!email){
        return res.status(400).json(
            new ApiResponse(400, null, "Please provide email")
        )
    }

    const user = await User.findOne({email});

    if(!user){
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        )
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    user.otpCode = hashedOtp;;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    await transporter.sendmail({
        from: process.env.GOOGLE_CLIENT_MAIL,
        to: email,
        subject: "Password Reset OTP",
        html: `<p>Your OTP for resetting your password is:</p>
             <h2>${otp}</h2>
             <p>This OTP will expire in 5 minutes.</p>`
    })

    return res.status(200).json(
        new ApiResponse(200, null, "OTP sent to email successfully")
    );
})

const verifyForgotPasswordOTP = asyncHandler(async (req, res) => {
    const {email, otp, newPassword} = req.body;

    if(!email || !otp || !newPassword){
        return res.status(400).json(
            new ApiResponse(400, null, "Please provide email, otp and new password")
        )
    }

    const user = await User.findOne({email});

    if(!user){
        return res.status(404).json(
            new ApiResponse(404, null, "User not found")
        )
    }

    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    if(user.otpCode !== hashedOtp){
        return res.status(400).json(
            new ApiResponse(400, null, "Invalid OTP")
        )
    }

    if(user.otpExpiry < Date.now()){
        return res.status(400).json(
            new ApiResponse(400, null, "OTP has expired")
        )
    }

    user.password = newPassword;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    return res.status(200).json(
        new ApiResponse(200, null, "Password reset successfully")
    );
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json(
      new ApiResponse(400, null, "At least one field is required")
    );
  }

  if (email) {
    const emailExists = await User.findOne({
      email,
      _id: { $ne: req.user._id }
    });

    if (emailExists) {
      throw new ApiError(409, "Email already in use");
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        ...(userName && { userName }),
        ...(email && { email }),
      },
    },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password -refreshToken");

  if (!updatedUser) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json(
    new ApiResponse(200, updatedUser, "Account details updated successfully")
  );
});

const updateUserAvatar = asyncHandler(async (req,res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        return res.status(400).json({
            success: false,
            message: "Avatar image is required",
        });
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        return res.status(500).json({
            success: false,
            message: "Error while uploading avatar",
        });
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(
        new ApiResponse(200, user, "User avatar updated successfully")
    );
})

export {
    registerUser, 
    loginUser, 
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    sendForgetPasswordOTP,
    verifyForgotPasswordOTP,
    updateAccountDetails,
    updateUserAvatar
}