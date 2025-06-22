import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service";

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
      console.error("Error fetching overview stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch overview statistics",
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
      console.error("Error fetching tickets by status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch tickets by status",
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
      console.error("Error fetching client stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch client statistics",
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
      console.error("Error fetching product stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch product statistics",
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

      const ticketCounts = {
        new: ticketsByStatus.new.length,
        in_progress: ticketsByStatus.in_progress.length,
        awaiting_client: ticketsByStatus.awaiting_client.length,
        resolved: ticketsByStatus.resolved.length,
      };

      const { ...filteredStats } = overviewStats;

      res.status(200).json({
        success: true,
        data: {
          overview: {
            stats: filteredStats,
            statusDistribution,
          },
          tickets: ticketCounts,
          clients: clientStats,
          products: productStats,
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data",
      });
    }
  }
}

export default DashboardController;
