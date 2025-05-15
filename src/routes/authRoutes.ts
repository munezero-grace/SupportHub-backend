import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { validateRequest } from "../middlewares/validateRequest";
import {
  signupValidation,
  loginValidation,
  googleValidation,
} from "../validations/auth.validation";

const router = Router();

router.post("/signup", validateRequest(signupValidation), async (req, res) => {
  await AuthController.signup(req, res);
});

router.post("/login", validateRequest(loginValidation), async (req, res) => {
  await AuthController.login(req, res);
});

router.post(
  "/google-signin",
  validateRequest(googleValidation),
  async (req, res) => {
    await AuthController.googleSignIn(req, res);
  }
);

export default router;
