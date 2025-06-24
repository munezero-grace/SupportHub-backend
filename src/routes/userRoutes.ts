import express from "express";
import UsersController from "../controllers/users.controller";
import { authenticateUser } from "../middlewares/authenticateUser";
import { WrapAsync } from "../middlewares/wrapAsync";
import { requireRole } from "../middlewares/requireRole";

const router = express.Router();

router.get(
  "/",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(UsersController.getAllUsers)
);
router.get(
  "/profile",
  WrapAsync(authenticateUser),
  WrapAsync(UsersController.getUserProfile)
);
router.put(
  "/profile",
  WrapAsync(authenticateUser),
  WrapAsync(UsersController.updateUserProfile)
);
// router.get('/users', WrapAsync(authenticateUser), WrapAsync(UsersController.getAllUsers));
router.delete('/users/:userId/soft-delete', WrapAsync(authenticateUser), WrapAsync(UsersController.softDeleteUser));

router.put(
  "/profile/company",
  WrapAsync(authenticateUser),
  WrapAsync(UsersController.updateUserCompanyProfile)
);
export default router;
