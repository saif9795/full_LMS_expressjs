import User from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

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

export {registerUser}