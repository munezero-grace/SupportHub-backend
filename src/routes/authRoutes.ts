import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validateRequest";
import {
  signupValidation,
  loginValidation,
  googleValidation,
} from "../validations/auth.validation";
import { WrapAsync } from "../middlewares/wrapAsync";

const router = Router();

router.post("/signup", validateRequest(signupValidation), WrapAsync(AuthController.signup));
router.post("/login", validateRequest(loginValidation), WrapAsync(AuthController.login));
router.post("/google-signin", validateRequest(googleValidation), WrapAsync(AuthController.googleSignIn));

export default router;
