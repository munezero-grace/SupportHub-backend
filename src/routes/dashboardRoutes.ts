import { Router, Request, Response } from "express";
import DashboardController from "../controllers/dashboard.controller";
import { errorHandler } from "../middlewares/errorHandler";
import { WrapAsync } from "../middlewares/wrapAsync";

const router = Router();

router.get("/test", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Dashboard API is working!",
    timestamp: new Date().toISOString(),
  });
});

router.get("/overview", WrapAsync(DashboardController.getOverviewStats));
router.get(
  "/tickets-by-status",
  WrapAsync(DashboardController.getTicketsByStatus)
);
router.get("/clients", WrapAsync(DashboardController.getClientStats));
router.get("/products", WrapAsync(DashboardController.getProductStats));
router.get("/all", WrapAsync(DashboardController.getAllDashboardData));

router.use(errorHandler);

export default router;
