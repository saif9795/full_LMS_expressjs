import User from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

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

    const isPasswordValid = await user.comparePassword(password);

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
        new ApiResponse(200, loggedInUser, accessToken, refreshToken, "User logged in successfully")
    );

})

export {registerUser, loginUser}