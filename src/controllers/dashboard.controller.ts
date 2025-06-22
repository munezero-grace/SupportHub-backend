import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service";
import { ERROR_MESSAGES } from "../constants/response/errors";

export class DashboardController {
  static async getOverviewStats(_req: Request, res: Response) {
    try {
      const stats = await DashboardService.getOverviewStats();
      const statusDistribution =
        await DashboardService.getTicketStatusDistribution();

      res.status(200).json({
        success: true,
        data: {
          stats,
          statusDistribution,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_FETCH_OVERVIEW_STATS,
      });
    }
  }

  static async getTicketsByStatus(_req: Request, res: Response) {
    try {
      const ticketsByStatus = await DashboardService.getTicketsByStatus();

      res.status(200).json({
        success: true,
        data: ticketsByStatus,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_FETCH_TICKETS_BY_STATUS,
      });
    }
  }

  static async getClientStats(_req: Request, res: Response) {
    try {
      const clientStats = await DashboardService.getClientStats();

      res.status(200).json({
        success: true,
        data: clientStats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_FETCH_CLIENT_STATS,
      });
    }
  }

  static async getProductStats(_req: Request, res: Response) {
    try {
      const productStats = await DashboardService.getProductStats();

      res.status(200).json({
        success: true,
        data: productStats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_FETCH_PRODUCT_STATS,
      });
    }
  }

  static async getAllDashboardData(_req: Request, res: Response) {
    try {
      const [overviewStats, ticketsByStatus, clientStats, productStats] =
        await Promise.all([
          DashboardService.getOverviewStats(),
          DashboardService.getTicketsByStatus(),
          DashboardService.getClientStats(),
          DashboardService.getProductStats(),
        ]);

      const statusDistribution =
        await DashboardService.getTicketStatusDistribution();

      const { ...filteredStats } = overviewStats;

      res.status(200).json({
        success: true,
        data: {
          overview: {
            stats: filteredStats,
            statusDistribution,
          },
          tickets: ticketsByStatus,
          clients: clientStats,
          products: productStats,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: ERROR_MESSAGES.FAILED_TO_FETCH_DASHBOARD_DATA,
      });
    }
  }
}

export default DashboardController;
