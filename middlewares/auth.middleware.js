import User from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import User from './../models/user.model';
import { ApiError } from "../utils/apiError.js";

export const verifyJWT = asyncHandler (async (req, res, next) => {
    try {
        const token = 
               req.cookies?.accessToken ||
               req.header("Authorization")?.replace("Bearer ", "");
        
        if(!token){
            ApiResponse(401, null, "Unauthorized Request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id).select("-password -refreshToken");

        if(!user){
            return new ApiResponse(401, null, "Invalid Access Token");
        }

        req.user = user;
        next();
    }catch (error) {
        return ApiError(401, null, "Invalid or expired Token");
    }
});

