import User from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/apiError.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = 
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

    if(!token){
        return res.status(401).json(
            new ApiResponse(401, null, "Unauthorized request")
        )
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id)
    .select("-password -refreshToken");

    if(!user){
        return res.status(401).json(
            new ApiResponse(401, null, "Invalid access token")
        )
    };

    req.user = user;
    next();

});

export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    throw new ApiError(403, "Access denied. You are not an admin.");
  }
  next();
};

export const isInstructor = (req, res, next) => {
  if (req.user?.role !== "instructor") {
    throw new ApiError(403, "Access denied. You are not an instructor.");
  }
  next();
};

export const isStudent = (req, res, next) => {
  if (req.user?.role !== "student") {
    throw new ApiError(403, "Access denied. You are not an student.");
  }
  next();
};

