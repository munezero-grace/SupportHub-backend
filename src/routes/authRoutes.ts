import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validateRequest";
import { WrapAsync } from "../middlewares/wrapAsync";
import { googleValidation, loginValidation, signupValidation } from "../validations/auth.validation";
import { authenticateUser } from "../middlewares/authenticateUser";

const router = Router();

router.post("/signup", validateRequest(signupValidation), WrapAsync(AuthController.signup));
router.post("/login", validateRequest(loginValidation), WrapAsync(AuthController.login));
router.post("/google-signin", validateRequest(googleValidation), WrapAsync(AuthController.googleSignIn));
router.post("/change-password", authenticateUser, WrapAsync(AuthController.changePassword));

export default router;