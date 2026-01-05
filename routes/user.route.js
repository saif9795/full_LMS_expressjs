import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, sendForgetPasswordOTP, verifyForgotPasswordOTP } from "../controllers/user.controller.js";
import { upload } from './../middlewares/multer.middleware.js';
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
      upload.single("avatar"), registerUser);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/get-current-user").get(verifyJWT, getCurrentUser);

router.route("/forgot-password").post(sendForgetPasswordOTP);

router.route("/verify-otp").post(verifyForgotPasswordOTP);

export default router;