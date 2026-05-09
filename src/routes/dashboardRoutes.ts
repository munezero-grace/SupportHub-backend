
import { Router } from "express";
import DashboardController from "../controllers/dashboard.controller";
import { errorHandler } from "../middlewares/errorHandler";
import { WrapAsync } from "../middlewares/wrapAsync";
import { authenticateUser } from "../middlewares/authenticateUser";
import { requireRole } from "../middlewares/requireRole";

const router = Router();

router.get(
  "/overview",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin", "ticket_manager")),
  WrapAsync(DashboardController.getOverviewStats)
);
router.get(
  "/tickets-by-status",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin", "ticket_manager")),
  WrapAsync(DashboardController.getTicketsByStatus)
);
router.get(
  "/clients",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin", "ticket_manager")),
  WrapAsync(DashboardController.getClientStats)
);
router.get(
  "/products",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin", "ticket_manager")),
  WrapAsync(DashboardController.getProductStats)
);
router.get(
  "/all",
  WrapAsync(authenticateUser),
  WrapAsync(requireRole("super_admin", "ticket_manager")),
  WrapAsync(DashboardController.getAllDashboardData)
);

router.use(errorHandler);

export default router;
