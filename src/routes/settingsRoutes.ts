import express from "express";
import SettingsController from "../controllers/settings.controller";
import { authenticateUser } from "../middlewares/authenticateUser";
import { WrapAsync } from "../middlewares/wrapAsync";

const router = express.Router();

router.get("/slack-integration", WrapAsync(authenticateUser), WrapAsync(SettingsController.getSlackSettings));
router.put("/slack-integration", WrapAsync(authenticateUser), WrapAsync(SettingsController.updateSlackSettings));

export default router;
