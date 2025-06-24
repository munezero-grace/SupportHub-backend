import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import SettingsService from "../services/settings.service";
import { getUserRole } from "../helpers/getUserRole";
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_ACCESS_DENIED,
} from "../constants/httpStatusCodes";
import { ERROR_MESSAGES } from "../constants/response/errors";
import { SUCCESS_MESSAGES } from "../constants/response/successMessages";

class SettingsController {
  static async getSlackSettings(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const userRole = await getUserRole(userId);
      if (!userRole?.includes("super_admin")) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const settings = await SettingsService.getSlackSettings(userId);
      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.USER_SETTINGS_RETRIEVED_SUCCESSFULLY,
        data: settings || null,
      });
    } catch (error: any) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: error.message || ERROR_MESSAGES.GENERAL_ERROR });
    }
  }

  static async updateSlackSettings(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.user?.id;

      if (!userId) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const userRole = await getUserRole(userId);
      if (!userRole?.includes("super_admin")) {
        return res
          .status(HTTP_ACCESS_DENIED)
          .json({ error: ERROR_MESSAGES.UNAUTHORIZED });
      }

      const { slackWebhookUrl, newTickets, ticketAssignments, statusChanges } =
        req.body;

      const updatedSettings = await SettingsService.updateSlackSettings(
        userId,
        {
          slackWebhookUrl,
          newTickets,
          ticketAssignments,
          statusChanges,
        }
      );

      return res.status(HTTP_OK).json({
        message: SUCCESS_MESSAGES.USER_SETTINGS_UPDATED_SUCCESSFULLY,
        data: updatedSettings,
      });
    } catch (error: any) {
      return res
        .status(HTTP_BAD_REQUEST)
        .json({ error: error.message || ERROR_MESSAGES.GENERAL_ERROR });
    }
  }
}

export default SettingsController;
