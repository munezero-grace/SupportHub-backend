import express from "express";
import SettingsController from "../controllers/settings.controller";
import { authenticateUser } from "../middlewares/authenticateUser";
import { WrapAsync } from "../middlewares/wrapAsync";

const router = express.Router();

router.get("/slack", WrapAsync(authenticateUser), WrapAsync(SettingsController.getSlackSettings));
router.post("/slack", WrapAsync(authenticateUser), WrapAsync(SettingsController.updateSlackSettings));
router.put("/slack", WrapAsync(authenticateUser), WrapAsync(SettingsController.updateSlackSettings));

export default router;
