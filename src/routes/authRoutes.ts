import express from "express";
import {
  signupWithEmail,
  loginWithEmail,
  googleSignIn,
} from "../controllers/authController";

const router = express.Router();


router.post("/signup", signupWithEmail);
router.post("/login", loginWithEmail);
router.post("/google-signin", googleSignIn);

export default router;
  

