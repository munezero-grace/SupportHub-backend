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

router.post(
  "/",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(UsersController.createUser)
);
router.get(
  "/team",
  WrapAsync(authenticateUser),
  WrapAsync(UsersController.getTeamMembers)
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

router.put(
  "/profile/company",
  WrapAsync(authenticateUser),
  WrapAsync(UsersController.updateUserCompanyProfile)
);
router.delete(
  "/:id/soft-delete",
  WrapAsync(authenticateUser),
  WrapAsync(UsersController.softDeleteUser)
);

router.post(
  "/:id/restore",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin")),
  WrapAsync(UsersController.reactivateUser)
);

export default router;
